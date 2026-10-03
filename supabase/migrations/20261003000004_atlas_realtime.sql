-- Extends the realtime coverage 20261003000003_atlas.sql set up (which
-- covers atlas_diseases/atlas_edges/atlas_metrics) with the remaining tables
-- /mechanisms needs for a fully live view: cluster identity/color, and the
-- organization/asset/contact counts behind its "patient groups", "assets",
-- and "contacts" columns.

do $$
declare t text;
begin
  foreach t in array array[
    'atlas_clusters', 'atlas_organizations',
    'atlas_disease_organizations', 'atlas_assets', 'atlas_contacts'
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

alter table atlas_clusters replica identity full;
alter table atlas_organizations replica identity full;
alter table atlas_disease_organizations replica identity full;
alter table atlas_assets replica identity full;
alter table atlas_contacts replica identity full;
