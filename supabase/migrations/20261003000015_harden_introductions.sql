-- Introduction requests are an authenticated, private workflow.  Keep their
-- identity and lifecycle in the database so direct PostgREST calls cannot
-- bypass the browser's narrow UI operations.

alter table public.introduction_requests
  add constraint introduction_requests_note_length
  check (char_length(btrim(note)) between 1 and 1000) not valid;

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

    -- `created_at` is part of the rate-limit boundary, never client input.
    new.created_at := now();

    -- Service-role administration is trusted. Browser-originated writes must
    -- be owned by the signed-in sender and pass the bounded intake checks.
    if auth.uid() is not null then
      if new.sender_id <> auth.uid() then
        raise exception 'Introduction sender must be the current user';
      end if;

      -- Lock both participant identities in a stable order. This makes the
      -- duplicate and quota checks safe under concurrent PostgREST inserts.
      first_lock := least(new.sender_id::text, new.recipient_id::text);
      second_lock := greatest(new.sender_id::text, new.recipient_id::text);
      perform pg_advisory_xact_lock(hashtextextended(first_lock, 1));
      perform pg_advisory_xact_lock(hashtextextended(second_lock, 1));

      if exists (
        select 1 from public.introduction_requests
        where sender_id = new.sender_id
          and recipient_id = new.recipient_id
          and status = 'pending'
      ) then
        raise exception 'An introduction request is already pending';
      end if;

      if (
        select count(*) from public.introduction_requests
        where sender_id = new.sender_id
          and created_at >= now() - interval '1 day'
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

drop trigger if exists guard_introduction_request on public.introduction_requests;
create trigger guard_introduction_request
before insert or update on public.introduction_requests
for each row execute function public.guard_introduction_request();

-- Use the original participants even if a future privileged integration edits
-- the row; the acceptance transition itself has already been validated above.
create or replace function public.open_private_conversation_on_accept()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare conversation uuid;
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.private_conversations (introduction_id)
    values (new.id)
    on conflict (introduction_id) do nothing
    returning id into conversation;

    if conversation is not null then
      insert into public.private_conversation_members (conversation_id, profile_id)
      values (conversation, old.sender_id), (conversation, old.recipient_id)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;
