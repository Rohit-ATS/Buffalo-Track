-- Buffalo-Track: seeds atlas_genes/atlas_pathways/atlas_phenotypes from the same
-- curated dataset as seed_atlas.sql, then backfills the FK columns
-- (20261003000005_atlas_nodes.sql) added to atlas_diseases/atlas_symptoms.
--
-- External registry IDs (hgnc_id, reactome_id, go_id, hpo_id) are left null,
-- same as atlas_trials.nct_id elsewhere in this project: null until matched to
-- a real entry, never a placeholder standing in for one.
--
-- Run after seed_atlas.sql (atlas_diseases/atlas_symptoms rows must exist
-- for the backfill updates to have anything to match).
-- Idempotent: inserts use `on conflict do nothing`, backfills are safe to re-run.

-- ---------------------------------------------------------------- genes
insert into atlas_genes (id, symbol) values
  ('CACNA1A', 'CACNA1A'),
  ('KCNQ2', 'KCNQ2'),
  ('SCN2A', 'SCN2A'),
  ('SNAP25', 'SNAP25'),
  ('STX1B', 'STX1B'),
  ('STXBP1', 'STXBP1'),
  ('SYT1', 'SYT1'),
  ('VAMP2', 'VAMP2')
on conflict (id) do nothing;

update atlas_diseases set gene_id = gene where gene_id is null;

-- ---------------------------------------------------------------- pathways
insert into atlas_pathways (id, name) values
  ('calcium-signaling', 'Calcium signaling'),
  ('neuronal-excitability', 'Neuronal excitability'),
  ('presynaptic-vesicle-release', 'Presynaptic vesicle release')
on conflict (id) do nothing;

update atlas_diseases d set pathway_id = p.id
from atlas_pathways p where p.name = d.pathway and d.pathway_id is null;

-- ---------------------------------------------------------------- phenotypes
insert into atlas_phenotypes (id, name) values
  ('ataxia', 'ataxia'),
  ('autism', 'autism'),
  ('developmental-delay', 'developmental delay'),
  ('epilepsy', 'epilepsy'),
  ('episodic-ataxia', 'episodic ataxia'),
  ('febrile-seizures', 'febrile seizures'),
  ('hemiplegic-migraine', 'hemiplegic migraine'),
  ('hypotonia', 'hypotonia'),
  ('intellectual-disability', 'intellectual disability'),
  ('movement-disorder', 'movement disorder'),
  ('neonatal-seizures', 'neonatal seizures'),
  ('nystagmus', 'nystagmus'),
  ('tremor', 'tremor')
on conflict (id) do nothing;

update atlas_symptoms s set phenotype_id = p.id
from atlas_phenotypes p where p.name = s.symptom and s.phenotype_id is null;

-- ---------------------------------------------------------------- publications, grants
-- Deliberately empty. The curated dataset has no per-paper or per-grant records --
-- only database-level sources (atlas_sources) -- so seeding either table here would
-- mean inventing papers and grants that don't exist. Same ethic as the unpopulated
-- atlas_metrics rows: honest gaps, not placeholders.

