-- Hackathon access model: anyone may READ the graph; only the backend
-- (service_role, which bypasses RLS) may write. No auth, no user accounts.
--
-- NOTE: this makes every row in these tables world-readable to anyone
-- holding the anon key, which ships in client-side JS. Demo data only.

-- 1. Public read policies
drop policy if exists "public read nodes" on nodes;
create policy "public read nodes" on nodes
  for select to anon, authenticated using (true);

drop policy if exists "public read edges" on edges;
create policy "public read edges" on edges
  for select to anon, authenticated using (true);

drop policy if exists "public read evidence" on evidence;
create policy "public read evidence" on evidence
  for select to anon, authenticated using (true);

-- No INSERT/UPDATE/DELETE policies: writes are service_role only.

-- 2. Realtime. Clients subscribe to changes on these tables.
--    Realtime honours RLS, so subscribers see exactly what the
--    select policies above allow.
--    Re-runnable: adding a table already in the publication is an error.
do $$
declare t text;
begin
  foreach t in array array['nodes','edges','evidence'] loop
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

-- 3. Replica identity.
--    nodes/edges are small, so send complete rows on UPDATE/DELETE and let
--    the client patch its local graph without a refetch.
alter table nodes replica identity full;
alter table edges replica identity full;

--    evidence keeps the DEFAULT (primary key) identity on purpose: a full
--    row would push the 1536-float embedding (~6KB) over the socket on every
--    change. DELETE events carry only the id; UPDATE events still carry the
--    new row, which is what a viewer needs. Switch to `full` only if you
--    need the OLD values of evidence rows.
