-- Closes the remaining gap in Realtime coverage. Of the 33 public tables,
-- 14 were already live (20261003000002/0003/0004/0006). This adds every
-- other public-readable content table -- 17 in total -- so any client can
-- subscribe to the full atlas, not just the slice /mechanisms happens to
-- read today.
--
-- Deliberately still excluded: atlas_serp_results and atlas_web_claims.
-- 20261003000006_web_discovery.sql already made this call on purpose --
-- "so the site shows discoveries as the pipeline lands them" -- meaning only
-- the polished, promoted output (runs, sources, discovered_assets) is
-- public-facing live; raw SERP candidates and claims (verified and rejected
-- mixed together) stay server-side. Nothing has changed to revisit that.

do $$
declare t text;
begin
  foreach t in array array[
    'atlas_disease_entities', 'atlas_genes', 'atlas_pathways', 'atlas_phenotypes',
    'atlas_publications', 'atlas_disease_publications',
    'atlas_grants', 'atlas_disease_grants',
    'atlas_trials', 'atlas_trial_diseases',
    'atlas_researchers', 'atlas_researcher_diseases',
    'atlas_sources', 'atlas_synonyms', 'atlas_symptoms',
    'atlas_open_questions', 'atlas_similarity'
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

-- Full row on UPDATE/DELETE, consistent with every other atlas_* table
-- already live -- a subscriber sees what changed, not just which key did.
alter table atlas_disease_entities replica identity full;
alter table atlas_genes replica identity full;
alter table atlas_pathways replica identity full;
alter table atlas_phenotypes replica identity full;
alter table atlas_publications replica identity full;
alter table atlas_disease_publications replica identity full;
alter table atlas_grants replica identity full;
alter table atlas_disease_grants replica identity full;
alter table atlas_trials replica identity full;
alter table atlas_trial_diseases replica identity full;
alter table atlas_researchers replica identity full;
alter table atlas_researcher_diseases replica identity full;
alter table atlas_sources replica identity full;
alter table atlas_synonyms replica identity full;
alter table atlas_symptoms replica identity full;
alter table atlas_open_questions replica identity full;
alter table atlas_similarity replica identity full;
