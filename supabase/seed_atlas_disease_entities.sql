-- Seeds atlas_disease_entities, then backfills atlas_diseases.disease_entity_id
-- (20261003000008_disease_entities.sql). Run after seed_atlas.sql.
--
-- One disease entity per current atlas_diseases row, reusing the same id and
-- name: in this dataset Disease and Mechanism Unit are genuinely 1:1 (see the
-- migration's header). mondo_id is left null -- no real MONDO lookup was done
-- against this snapshot, same as every other unresolved external ID here.
-- Idempotent: insert uses `on conflict do nothing`, the backfill only touches
-- null rows.

insert into atlas_disease_entities (id, name) values
  ('stxbp1', 'STXBP1 encephalopathy'),
  ('stx1b', 'STX1B-related epilepsy'),
  ('snap25', 'SNAP25 encephalopathy'),
  ('syt1', 'SYT1-associated neurodevelopmental disorder'),
  ('scn2a', 'SCN2A-related disorder'),
  ('kcnq2', 'KCNQ2 encephalopathy'),
  ('cacna1a-ea2', 'Episodic ataxia type 2'),
  ('cacna1a-fhm1', 'Familial hemiplegic migraine type 1'),
  ('vamp2', 'VAMP2-related neurodevelopmental disorder')
on conflict (id) do nothing;

update atlas_diseases set disease_entity_id = id where disease_entity_id is null;
