-- Columns the external-data loaders (backend/app/loaders/) need to persist
-- what the plan's checklist asks them to store, and that nothing existing
-- covered: HPO phenotype frequency, and compact ClinVar/ClinGen summaries.
-- All nullable -- empty until a loader actually runs.

alter table atlas_symptoms add column if not exists frequency real
  check (frequency is null or (frequency >= 0 and frequency <= 1));
comment on column atlas_symptoms.frequency is
  'From HPO''s genes_to_phenotype.txt: how often this phenotype occurs with this disease, 0-1. Parsed from a fraction or the HPO frequency sub-ontology (HP:0040280-4).';

alter table atlas_genes add column if not exists clinvar_summary jsonb;
comment on column atlas_genes.clinvar_summary is
  'Pathogenic/likely-pathogenic variant counts and review-status breakdown from ClinVar (NCBI e-utilities). Never used to infer effect_class -- missense/nonsense is not the same question as loss-of-function/gain-of-function.';

alter table atlas_genes add column if not exists dosage_sensitivity jsonb;
comment on column atlas_genes.dosage_sensitivity is
  'ClinGen haploinsufficiency/triplosensitivity classifications, e.g. {"haploinsufficiency": "Sufficient Evidence", "triplosensitivity": "No Evidence"}.';
