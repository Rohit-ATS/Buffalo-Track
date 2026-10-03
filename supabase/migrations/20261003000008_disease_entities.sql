-- Splits out Disease (MONDO) as its own node, distinct from Mechanism Unit
-- (gene x effect class). Deferred in 20261003000005_atlas_nodes.sql pending
-- its own review; this is that migration.
--
-- Additive, same pattern as atlas_genes/atlas_pathways/atlas_phenotypes:
-- atlas_diseases keeps its existing mondo_id/name columns untouched (so the
-- query layer's DISEASE_SELECT, generator, and every integration test that
-- already reads them keep working unchanged), and gets a new nullable FK to
-- the normalized entity instead of being renamed or restructured.
--
-- Why this wasn't a pure rename: in the current data, Disease and Mechanism
-- Unit are genuinely 1:1 -- CACNA1A's two mechanism units are two different
-- diagnosable diseases (Episodic ataxia type 2 vs Familial hemiplegic
-- migraine type 1), not one disease described two ways. The split exists for
-- the case the plan's node list anticipates but this dataset doesn't contain
-- yet: the same named disease explained by more than one mechanism unit. A
-- nullable FK supports that the moment it shows up, without a migration.
create table if not exists atlas_disease_entities (
  id         text primary key,
  mondo_id   text,  -- null until matched to a real MONDO entry; same rule as
                     -- atlas_trials.nct_id and every other unresolved external ID here.
  name       text not null,
  created_at timestamptz not null default now()
);

alter table atlas_diseases
  add column if not exists disease_entity_id text references atlas_disease_entities (id);
create index if not exists atlas_diseases_disease_entity_id_idx on atlas_diseases (disease_entity_id);

alter table atlas_disease_entities enable row level security;
drop policy if exists atlas_disease_entities_read on atlas_disease_entities;
create policy atlas_disease_entities_read on atlas_disease_entities
  for select to anon, authenticated using (true);

-- Not added to the realtime publication: nothing reads this table live yet,
-- same reasoning as 20261003000005_atlas_nodes.sql's new tables.
