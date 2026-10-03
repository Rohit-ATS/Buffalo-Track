-- Enables Realtime on the atlas_* tables /mechanisms reads live. RLS already
-- grants anon/authenticated SELECT on all of them (20261003000003_atlas.sql),
-- so Realtime subscribers see exactly what that policy allows.
--
-- Scoped to the tables the live mechanism view actually queries, not the
-- whole atlas_* set (atlas_trials, atlas_researchers, atlas_metrics, and
-- atlas_similarity aren't read by any live view yet).

do $$
declare t text;
begin
  foreach t in array array[
    'atlas_clusters', 'atlas_diseases', 'atlas_edges',
    'atlas_organizations', 'atlas_disease_organizations',
    'atlas_assets', 'atlas_contacts'
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

-- Small reference tables: send full rows on UPDATE/DELETE so clients can
-- patch in place without a refetch.
alter table atlas_clusters replica identity full;
alter table atlas_diseases replica identity full;
alter table atlas_edges replica identity full;
alter table atlas_organizations replica identity full;
alter table atlas_disease_organizations replica identity full;
alter table atlas_assets replica identity full;
alter table atlas_contacts replica identity full;
