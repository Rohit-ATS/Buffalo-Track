-- Close the access and abuse-control gaps in the family network.

drop policy if exists "members and stewards read circles" on public.circles;
create policy "members and stewards read circles" on public.circles
  for select to authenticated
  using (is_circle_member(id) or is_circle_steward(id));

drop policy if exists "members read membership" on public.circle_members;
create policy "members read membership" on public.circle_members
  for select to authenticated
  using (profile_id = auth.uid() or is_circle_steward(circle_id));

alter table public.circle_messages
  add constraint circle_messages_body_length
  check (char_length(btrim(body)) between 1 and 5000) not valid;

alter table public.private_messages
  add constraint private_messages_body_length
  check (char_length(btrim(body)) between 1 and 5000) not valid;

create or replace function public.guard_message_rate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 2));
    if (
      select count(*)
      from public.circle_messages
      where sender_id = auth.uid()
        and created_at >= now() - interval '1 minute'
    ) + (
      select count(*)
      from public.private_messages
      where sender_id = auth.uid()
        and created_at >= now() - interval '1 minute'
    ) >= 30 then
      raise exception 'Message rate limit reached';
    end if;
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists guard_circle_message on public.circle_messages;
create trigger guard_circle_message
before insert on public.circle_messages
for each row execute function public.guard_message_rate();

drop trigger if exists guard_private_message on public.private_messages;
create trigger guard_private_message
before insert on public.private_messages
for each row execute function public.guard_message_rate();

create or replace function public.guard_introduction_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  first_lock text;
  second_lock text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'New introduction requests must be pending';
    end if;
    if new.sender_id = new.recipient_id then
      raise exception 'You cannot introduce yourself';
    end if;
    new.created_at := now();

    if auth.uid() is not null then
      if new.sender_id <> auth.uid() then
        raise exception 'Introduction sender must be the current user';
      end if;

      if exists (
        select 1
        from public.profile_blocks
        where (blocker_id = new.recipient_id and blocked_id = new.sender_id)
           or (blocker_id = new.sender_id and blocked_id = new.recipient_id)
      ) then
        raise exception 'Introduction requests are blocked between these profiles';
      end if;

      first_lock := least(new.sender_id::text, new.recipient_id::text);
      second_lock := greatest(new.sender_id::text, new.recipient_id::text);
      perform pg_advisory_xact_lock(hashtextextended(first_lock, 1));
      perform pg_advisory_xact_lock(hashtextextended(second_lock, 1));

      if exists (
        select 1 from public.introduction_requests
        where sender_id = new.sender_id and recipient_id = new.recipient_id
          and status = 'pending'
      ) then
        raise exception 'An introduction request is already pending';
      end if;
      if (
        select count(*) from public.introduction_requests
        where sender_id = new.sender_id and created_at >= now() - interval '1 day'
      ) >= 10 then
        raise exception 'Introduction request limit reached';
      end if;
      if (
        select count(*) from public.introduction_requests
        where recipient_id = new.recipient_id and status = 'pending'
      ) >= 25 then
        raise exception 'This recipient has reached the pending request limit';
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.sender_id is distinct from old.sender_id
       or new.recipient_id is distinct from old.recipient_id
       or new.note is distinct from old.note
       or new.created_at is distinct from old.created_at then
      raise exception 'Introduction participants, note, and creation time are immutable';
    end if;
    if old.status <> 'pending'
       or new.status not in ('accepted', 'declined', 'group_suggested') then
      raise exception 'Only a pending introduction can receive one response';
    end if;
  end if;
  return new;
end;
$$;

-- Private history is exposed only through a bounded function. Direct table
-- reads are revoked so a client cannot bypass the page-size ceiling.
revoke select on public.private_messages from authenticated;
create or replace function public.load_private_messages(
  p_conversation_id uuid,
  p_limit integer default 100
)
returns table (id uuid, body text, sender_id uuid, created_at timestamptz)
language sql
security definer
set search_path = public, pg_temp
as $$
  select pm.id, pm.body, pm.sender_id, pm.created_at
  from public.private_messages pm
  where pm.conversation_id = p_conversation_id
    and public.is_private_conversation_member(p_conversation_id)
  order by pm.created_at, pm.id
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;
revoke all on function public.load_private_messages(uuid, integer) from public;
grant execute on function public.load_private_messages(uuid, integer) to authenticated;

-- Telemetry remains usable for signed-out visitors, but no longer accepts
-- arbitrary table writes or unbounded values.
revoke insert on public.atlas_dashboard_clicks from anon, authenticated;
create or replace function public.record_dashboard_click(
  p_source text,
  p_from_path text,
  p_search text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_source !~ '^(landing_sign_in|landing_cta|landing_cta_signed_in|nav_devon|nav_family_space|nav_overview|account_menu_settings|access_denied_family_space|dashboard_shell_section_[a-z0-9_-]+)$'
     or p_from_path !~ '^/[A-Za-z0-9/_-]{0,200}$'
     or p_search is not null and (char_length(p_search) > 500 or p_search !~ '^[A-Za-z0-9_=&%.,~+:/-]*$') then
    raise exception 'Invalid dashboard click payload';
  end if;
  if (
    select count(*)
    from public.atlas_dashboard_clicks
    where source = p_source
      and from_path = p_from_path
      and created_at >= now() - interval '1 minute'
  ) >= 60 then
    return;
  end if;
  insert into public.atlas_dashboard_clicks (source, from_path, search)
  values (p_source, p_from_path, nullif(p_search, ''));
end;
$$;
revoke all on function public.record_dashboard_click(text, text, text) from public;
grant execute on function public.record_dashboard_click(text, text, text) to anon, authenticated;
