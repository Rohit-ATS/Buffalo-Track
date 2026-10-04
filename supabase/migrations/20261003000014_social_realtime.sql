-- Realtime for the family network.
--
-- 0012 built circles, messages, introductions and private conversations with
-- careful RLS, but none of those tables were in the realtime publication — so a
-- message only appeared after a manual refresh. A group chat that needs a
-- reload is not a conversation.
--
-- Realtime honours RLS: a subscriber is sent a change only if its own select
-- policy would return that row. The policies from 0012 already restrict reads
-- to circle members and conversation participants, so adding these tables
-- broadcasts nothing that a member could not already query.

do $$
declare t text;
begin
  foreach t in array array[
    'circle_messages',          -- group conversation
    'private_messages',         -- one-to-one, after an accepted introduction
    'circle_members',           -- a join request being approved, live
    'introduction_requests',    -- an introduction arriving or being answered
    'private_conversations'     -- the conversation created on acceptance
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Replica identity is deliberately left at the primary-key default for the
-- message tables. These are append-only in the product, so DELETE/UPDATE
-- payloads are not needed, and `full` would broadcast the entire old row —
-- more private content on the wire than any client needs.
--
-- The membership tables do get `full`: approving or blocking a member is an
-- UPDATE, and the client needs the previous status to know what changed.
alter table public.circle_members        replica identity full;
alter table public.introduction_requests replica identity full;
