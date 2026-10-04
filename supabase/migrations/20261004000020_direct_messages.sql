-- Direct messages: anyone on the atlas can start a one-to-one thread, the way
-- a social app works, without giving up the two rules the family network was
-- built on.
--
--   * A profile stays unreadable by other members. The only fields that leave
--     are the ones a person published by turning on `matching_opt_in`, and they
--     leave through a function, never through a table read.
--   * A first message from a stranger lands in Requests, not in the inbox, and
--     is capped at three messages until the recipient accepts. Blocking still
--     closes the door in both directions.
--
-- Threads opened by an accepted introduction keep working unchanged; they are
-- the same tables with `kind = 'introduction'`.

alter table public.profiles add column if not exists avatar_url text;

-- A direct thread has no introduction behind it.
alter table public.private_conversations alter column introduction_id drop not null;
alter table public.private_conversations add column if not exists kind text not null default 'introduction';
alter table public.private_conversations add column if not exists pair_low uuid references public.profiles(id) on delete cascade;
alter table public.private_conversations add column if not exists pair_high uuid references public.profiles(id) on delete cascade;
alter table public.private_conversations drop constraint if exists private_conversations_kind_check;
alter table public.private_conversations add constraint private_conversations_kind_check
  check (kind in ('introduction', 'direct'));
alter table public.private_conversations drop constraint if exists private_conversations_shape_check;
alter table public.private_conversations add constraint private_conversations_shape_check check (
  (kind = 'introduction' and introduction_id is not null)
  or (kind = 'direct' and pair_low is not null and pair_high is not null and pair_low < pair_high)
);

-- One direct thread per pair, so reopening a conversation finds the history
-- instead of starting a second one beside it.
create unique index if not exists private_conversations_direct_pair
  on public.private_conversations (pair_low, pair_high) where kind = 'direct';

alter table public.private_conversation_members add column if not exists state text not null default 'accepted';
alter table public.private_conversation_members add column if not exists last_read_at timestamptz;
alter table public.private_conversation_members drop constraint if exists private_conversation_members_state_check;
alter table public.private_conversation_members add constraint private_conversation_members_state_check
  check (state in ('accepted', 'request', 'declined'));

create index if not exists private_messages_thread_time
  on public.private_messages (conversation_id, created_at desc);

-- ------------------------------------------------------------------ people
-- Search is the only way to find someone to message, and it reads nothing a
-- person did not publish: `matching_opt_in` is the consent, and a block on
-- either side removes them from each other's results entirely.
create or replace function public.search_people(p_query text, p_limit integer default 10)
returns table (id uuid, display_name text, avatar_url text, condition text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.display_name, p.avatar_url, p.condition
  from public.profiles p
  where auth.uid() is not null
    and p.matching_opt_in
    and p.id <> auth.uid()
    and coalesce(btrim(p_query), '') <> ''
    and (
      p.display_name ilike '%' || replace(replace(btrim(p_query), '\', '\\'), '%', '\%') || '%'
      or p.condition ilike '%' || replace(replace(btrim(p_query), '\', '\\'), '%', '\%') || '%'
    )
    and not exists (
      select 1 from public.profile_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by p.display_name nulls last, p.id
  limit least(greatest(coalesce(p_limit, 10), 1), 25);
$$;

-- --------------------------------------------------------------- open a DM
create or replace function public.open_direct_conversation(p_other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  low uuid;
  high uuid;
  conversation uuid;
  discoverable boolean;
  introduced boolean;
begin
  if me is null then
    raise exception 'Sign in before starting a conversation';
  end if;
  if p_other_id is null or p_other_id = me then
    raise exception 'Pick someone else to message';
  end if;
  if exists (
    select 1 from public.profile_blocks
    where (blocker_id = me and blocked_id = p_other_id)
       or (blocker_id = p_other_id and blocked_id = me)
  ) then
    raise exception 'This conversation is not available';
  end if;

  select matching_opt_in into discoverable from public.profiles where id = p_other_id;
  if discoverable is null then
    raise exception 'That account does not exist';
  end if;

  introduced := exists (
    select 1 from public.introduction_requests r
    where r.status = 'accepted'
      and ((r.sender_id = me and r.recipient_id = p_other_id)
        or (r.sender_id = p_other_id and r.recipient_id = me))
  );

  -- Someone who has not opted into being found can still be reached, but only
  -- by a person they already accepted an introduction from.
  if not discoverable and not introduced then
    raise exception 'That person is not open to new messages';
  end if;

  low := least(me, p_other_id);
  high := greatest(me, p_other_id);

  select id into conversation
  from public.private_conversations
  where kind = 'direct' and pair_low = low and pair_high = high;
  if conversation is not null then
    return conversation;
  end if;

  insert into public.private_conversations (kind, pair_low, pair_high)
  values ('direct', low, high)
  on conflict (pair_low, pair_high) where kind = 'direct' do nothing
  returning id into conversation;

  if conversation is null then
    -- Lost the race with the other side opening the same thread.
    select id into conversation
    from public.private_conversations
    where kind = 'direct' and pair_low = low and pair_high = high;
    return conversation;
  end if;

  insert into public.private_conversation_members (conversation_id, profile_id, state)
  values (conversation, me, 'accepted'),
         (conversation, p_other_id, case when introduced then 'accepted' else 'request' end)
  on conflict do nothing;

  return conversation;
end;
$$;

-- ------------------------------------------------------------------ inbox
-- One row per thread, with the other person as they chose to be seen. A name
-- is returned only when they published it or when they accepted this thread;
-- otherwise the client shows a short id, as it does everywhere else.
create or replace function public.list_conversations()
returns table (
  conversation_id uuid,
  kind text,
  state text,
  other_id uuid,
  other_name text,
  other_avatar text,
  other_condition text,
  last_body text,
  last_sender_id uuid,
  last_at timestamptz,
  unread_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    mine.conversation_id,
    mine.kind,
    mine.state,
    them.profile_id,
    case when visible.ok then p.display_name end,
    case when visible.ok then p.avatar_url end,
    case when visible.ok then p.condition end,
    last.body,
    last.sender_id,
    last.created_at,
    (
      select count(*)
      from public.private_messages pm
      where pm.conversation_id = mine.conversation_id
        and pm.sender_id <> auth.uid()
        and pm.created_at > coalesce(mine.last_read_at, '-infinity'::timestamptz)
    )::integer
  from (
    select m.conversation_id, m.state, m.last_read_at, c.kind
    from public.private_conversation_members m
    join public.private_conversations c on c.id = m.conversation_id
    where m.profile_id = auth.uid()
  ) mine
  left join lateral (
    select m.profile_id, m.state
    from public.private_conversation_members m
    where m.conversation_id = mine.conversation_id and m.profile_id <> auth.uid()
    limit 1
  ) them on true
  left join public.profiles p on p.id = them.profile_id
  left join lateral (
    select coalesce(p.matching_opt_in, false) or them.state = 'accepted' as ok
  ) visible on true
  left join lateral (
    select pm.body, pm.sender_id, pm.created_at
    from public.private_messages pm
    where pm.conversation_id = mine.conversation_id
    order by pm.created_at desc, pm.id desc
    limit 1
  ) last on true
  where auth.uid() is not null
    and mine.state <> 'declined'
    and not exists (
      select 1 from public.profile_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = them.profile_id
    )
  order by coalesce(last.created_at, '-infinity'::timestamptz) desc, mine.conversation_id;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.private_conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and profile_id = auth.uid();
$$;

create or replace function public.respond_to_message_request(p_conversation_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before answering a message request';
  end if;
  update public.private_conversation_members
  set state = case when p_accept then 'accepted' else 'declined' end
  where conversation_id = p_conversation_id
    and profile_id = auth.uid()
    and state = 'request';
  if not found then
    raise exception 'There is no pending request on this conversation';
  end if;
end;
$$;

-- --------------------------------------------------------------- abuse cap
-- Until a request is accepted, the sender gets three messages. That is enough
-- to say who you are and why you are writing, and not enough to use a stranger's
-- inbox as a megaphone.
create or replace function public.guard_direct_request_volume()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recipient_state text;
  sender_state text;
  sent integer;
begin
  select state into sender_state
  from public.private_conversation_members
  where conversation_id = new.conversation_id and profile_id = new.sender_id;

  select state into recipient_state
  from public.private_conversation_members
  where conversation_id = new.conversation_id and profile_id <> new.sender_id
  limit 1;

  if sender_state = 'declined' or recipient_state = 'declined' then
    raise exception 'This conversation is closed';
  end if;

  if recipient_state = 'request' then
    select count(*) into sent
    from public.private_messages
    where conversation_id = new.conversation_id and sender_id = new.sender_id;
    if sent >= 3 then
      raise exception 'Wait for a reply before sending more messages';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_direct_request on public.private_messages;
create trigger guard_direct_request
before insert on public.private_messages
for each row execute function public.guard_direct_request_volume();

-- ------------------------------------------------------------------ grants
revoke all on function public.search_people(text, integer) from public;
revoke all on function public.open_direct_conversation(uuid) from public;
revoke all on function public.list_conversations() from public;
revoke all on function public.mark_conversation_read(uuid) from public;
revoke all on function public.respond_to_message_request(uuid, boolean) from public;
grant execute on function
  public.search_people(text, integer),
  public.open_direct_conversation(uuid),
  public.list_conversations(),
  public.mark_conversation_read(uuid),
  public.respond_to_message_request(uuid, boolean)
to authenticated;
