-- Buffalo-Track: demo data for the atlas_* typed schema (20261003000003_atlas.sql).
-- Generated verbatim from frontend/src/lib/atlas-data.ts (the same dataset powering
-- the static sample views) so the live-queried /mechanisms table matches it exactly.
-- Idempotent: every insert uses `on conflict do nothing`, safe to re-run.

-- ---------------------------------------------------------------- sources
insert into atlas_sources (id, name, url, pulled_at, record_count) values
  ('clinvar', 'ClinVar', 'https://www.ncbi.nlm.nih.gov/clinvar/', '2026-10-02', 412),
  ('orphanet', 'Orphanet', 'https://www.orpha.net/', '2026-10-01', 186),
  ('pubmed', 'PubMed', 'https://pubmed.ncbi.nlm.nih.gov/', '2026-10-02', 1240),
  ('ctgov', 'ClinicalTrials.gov', 'https://clinicaltrials.gov/', '2026-09-30', 58),
  ('hpo', 'Human Phenotype Ontology', 'https://hpo.jax.org/', '2026-09-29', 930)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- clusters
insert into atlas_clusters (id, name, pathway, color) values
  ('snare', 'SNARE vesicle fusion', 'Presynaptic vesicle release', 'var(--primary)'),
  ('channel', 'Ion channel excitability', 'Neuronal excitability', 'var(--highlight)'),
  ('calcium', 'P/Q calcium channel', 'Calcium signaling', 'var(--risk)')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- mechanism units
insert into atlas_diseases (id, name, gene, effect_class, pathway, cluster_id, importance, no_route) values
  ('stxbp1', 'STXBP1 encephalopathy', 'STXBP1', 'loss of function', 'Presynaptic vesicle release', 'snare', 10, false),
  ('stx1b', 'STX1B-related epilepsy', 'STX1B', 'loss of function', 'Presynaptic vesicle release', 'snare', 6, false),
  ('snap25', 'SNAP25 encephalopathy', 'SNAP25', 'loss of function', 'Presynaptic vesicle release', 'snare', 5, false),
  ('syt1', 'SYT1-associated neurodevelopmental disorder', 'SYT1', 'loss of function', 'Presynaptic vesicle release', 'snare', 4, false),
  ('scn2a', 'SCN2A-related disorder', 'SCN2A', 'gain of function', 'Neuronal excitability', 'channel', 8, false),
  ('kcnq2', 'KCNQ2 encephalopathy', 'KCNQ2', 'loss of function', 'Neuronal excitability', 'channel', 6, false),
  ('cacna1a-ea2', 'Episodic ataxia type 2', 'CACNA1A', 'loss of function', 'Calcium signaling', 'calcium', 5, false),
  ('cacna1a-fhm1', 'Familial hemiplegic migraine type 1', 'CACNA1A', 'gain of function', 'Calcium signaling', 'calcium', 4, false),
  ('vamp2', 'VAMP2-related neurodevelopmental disorder', 'VAMP2', 'loss of function', 'Presynaptic vesicle release', 'snare', 2, true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- synonyms
insert into atlas_synonyms (disease_id, synonym) values
  ('stxbp1', 'STXBP1 disorder'),
  ('stxbp1', 'Munc18-1 encephalopathy'),
  ('stxbp1', 'DEE4'),
  ('stx1b', 'STX1B disorder'),
  ('stx1b', 'Fever-associated epilepsy syndrome'),
  ('snap25', 'SNAP25 disorder'),
  ('snap25', 'CMS18'),
  ('syt1', 'Baker-Gordon syndrome'),
  ('syt1', 'SYT1 disorder'),
  ('scn2a', 'SCN2A epilepsy'),
  ('kcnq2', 'KCNQ2 DEE'),
  ('cacna1a-ea2', 'EA2'),
  ('cacna1a-ea2', 'CACNA1A episodic ataxia'),
  ('cacna1a-fhm1', 'FHM1'),
  ('cacna1a-fhm1', 'CACNA1A migraine'),
  ('vamp2', 'VAMP2 disorder')
on conflict (disease_id, synonym) do nothing;

-- ---------------------------------------------------------------- symptoms
insert into atlas_symptoms (disease_id, symptom) values
  ('stxbp1', 'epilepsy'),
  ('stxbp1', 'developmental delay'),
  ('stxbp1', 'tremor'),
  ('stx1b', 'epilepsy'),
  ('stx1b', 'febrile seizures'),
  ('stx1b', 'developmental delay'),
  ('snap25', 'epilepsy'),
  ('snap25', 'intellectual disability'),
  ('snap25', 'ataxia'),
  ('syt1', 'developmental delay'),
  ('syt1', 'movement disorder'),
  ('scn2a', 'epilepsy'),
  ('scn2a', 'autism'),
  ('kcnq2', 'neonatal seizures'),
  ('kcnq2', 'developmental delay'),
  ('cacna1a-ea2', 'episodic ataxia'),
  ('cacna1a-ea2', 'nystagmus'),
  ('cacna1a-fhm1', 'hemiplegic migraine'),
  ('cacna1a-fhm1', 'ataxia'),
  ('vamp2', 'hypotonia'),
  ('vamp2', 'developmental delay')
on conflict (disease_id, symptom) do nothing;

-- ---------------------------------------------------------------- open questions
-- No natural unique key (bigserial id), so re-runs clear this seed's rows first
-- rather than relying on `on conflict`.
delete from atlas_open_questions where disease_id in (
  'stxbp1', 'stx1b', 'snap25', 'syt1', 'scn2a', 'kcnq2', 'cacna1a-ea2', 'cacna1a-fhm1', 'vamp2'
);
insert into atlas_open_questions (disease_id, question, position) values
  ('stxbp1', 'Which seizure outcomes transfer to STX1B?', 0),
  ('stxbp1', 'Is the mouse model valid for STX1B?', 1),
  ('stxbp1', 'What age range should cohorts share?', 2),
  ('stx1b', 'No natural history study yet', 0),
  ('stx1b', 'No dedicated patient group', 1),
  ('stx1b', 'Unknown long-term outcomes', 2),
  ('snap25', 'Shared outcome measures with STXBP1?', 0),
  ('syt1', 'Registry overlaps with SNAP25 registry', 0),
  ('scn2a', 'Which variants respond to channel blockers?', 0),
  ('kcnq2', 'Shared EEG endpoints?', 0),
  ('cacna1a-ea2', 'Separate outcomes from FHM1', 0),
  ('cacna1a-fhm1', 'Opposite variant effect to EA2', 0),
  ('vamp2', 'No patient group', 0),
  ('vamp2', 'No shared asset', 1),
  ('vamp2', 'Too few published cases', 2);

-- ---------------------------------------------------------------- organizations
insert into atlas_organizations (id, name, kind) values
  ('stxbp1-foundation', 'STXBP1 Foundation', 'patient group'),
  ('snap25-families', 'SNAP25 Families', 'patient group'),
  ('baker-gordon-syndrome-network', 'Baker-Gordon Syndrome Network', 'patient group'),
  ('familiescn2a', 'FamilieSCN2A', 'patient group'),
  ('kcnq2-cure-alliance', 'KCNQ2 Cure Alliance', 'patient group'),
  ('cacna1a-foundation', 'CACNA1A Foundation', 'patient group')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- disease <-> organization
insert into atlas_disease_organizations (disease_id, organization_id) values
  ('stxbp1', 'stxbp1-foundation'),
  ('snap25', 'snap25-families'),
  ('syt1', 'baker-gordon-syndrome-network'),
  ('scn2a', 'familiescn2a'),
  ('kcnq2', 'kcnq2-cure-alliance'),
  ('cacna1a-ea2', 'cacna1a-foundation'),
  ('cacna1a-fhm1', 'cacna1a-foundation')
on conflict (disease_id, organization_id) do nothing;

-- ---------------------------------------------------------------- assets
insert into atlas_assets (id, disease_id, kind, name, owner, url) values
  ('stxbp1-asset-1', 'stxbp1', 'natural history study', 'STXBP1 Natural History Study', 'STXBP1 Foundation', 'https://clinicaltrials.gov/'),
  ('stxbp1-asset-2', 'stxbp1', 'registry', 'STXBP1 Global Registry', 'STXBP1 Foundation', 'https://www.stxbp1disorders.org/'),
  ('stxbp1-asset-3', 'stxbp1', 'model', 'Stxbp1 haploinsufficient mouse', 'Academic consortium', 'https://pubmed.ncbi.nlm.nih.gov/'),
  ('stx1b-asset-1', 'stx1b', 'registry', 'Small family registry (draft)', 'Parent volunteers', 'https://www.orpha.net/'),
  ('snap25-asset-1', 'snap25', 'registry', 'SNARE disorders registry', 'SNAP25 Families', 'https://www.orpha.net/'),
  ('snap25-asset-2', 'snap25', 'natural history study', 'SNARE natural history pilot', 'SNAP25 Families', 'https://clinicaltrials.gov/'),
  ('syt1-asset-1', 'syt1', 'registry', 'SYT1 registry', 'Baker-Gordon Syndrome Network', 'https://www.orpha.net/'),
  ('scn2a-asset-1', 'scn2a', 'trial', 'Antisense oligonucleotide trial', 'Biotech sponsor', 'https://clinicaltrials.gov/'),
  ('scn2a-asset-2', 'scn2a', 'registry', 'SCN2A Registry', 'FamilieSCN2A', 'https://www.orpha.net/'),
  ('kcnq2-asset-1', 'kcnq2', 'natural history study', 'KCNQ2 natural history', 'KCNQ2 Cure Alliance', 'https://clinicaltrials.gov/'),
  ('cacna1a-ea2-asset-1', 'cacna1a-ea2', 'registry', 'CACNA1A registry', 'CACNA1A Foundation', 'https://www.orpha.net/'),
  ('cacna1a-fhm1-asset-1', 'cacna1a-fhm1', 'registry', 'CACNA1A registry', 'CACNA1A Foundation', 'https://www.orpha.net/'),
  ('cacna1a-fhm1-asset-2', 'cacna1a-fhm1', 'model', 'FHM1 knock-in mouse', 'Academic lab', 'https://pubmed.ncbi.nlm.nih.gov/')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- contacts
-- No natural unique key (bigserial id), so re-runs clear this seed's rows first
-- rather than relying on `on conflict`.
delete from atlas_contacts where disease_id in (
  'stxbp1', 'stx1b', 'snap25', 'syt1', 'scn2a', 'kcnq2', 'cacna1a-ea2', 'cacna1a-fhm1', 'vamp2'
);
insert into atlas_contacts (disease_id, role, name, org, source_id, url) values
  ('stxbp1', 'patient group', 'STXBP1 Foundation', 'Family foundation', 'orphanet', 'https://www.orpha.net/'),
  ('stxbp1', 'lead investigator', 'Natural history study PI', 'Children''s hospital', 'ctgov', 'https://clinicaltrials.gov/'),
  ('stx1b', 'lead investigator', 'STX1B case-series author', 'University neurology dept.', 'pubmed', 'https://pubmed.ncbi.nlm.nih.gov/'),
  ('snap25', 'patient group', 'SNAP25 Families', 'Parent network', 'orphanet', 'https://www.orpha.net/'),
  ('syt1', 'patient group', 'Baker-Gordon Syndrome Network', 'Parent network', 'orphanet', 'https://www.orpha.net/'),
  ('scn2a', 'patient group', 'FamilieSCN2A', 'Family foundation', 'orphanet', 'https://www.orpha.net/'),
  ('kcnq2', 'patient group', 'KCNQ2 Cure Alliance', 'Family foundation', 'orphanet', 'https://www.orpha.net/'),
  ('cacna1a-ea2', 'patient group', 'CACNA1A Foundation', 'Family foundation', 'orphanet', 'https://www.orpha.net/'),
  ('cacna1a-fhm1', 'patient group', 'CACNA1A Foundation', 'Family foundation', 'orphanet', 'https://www.orpha.net/');

-- ---------------------------------------------------------------- edges
-- `quote` is required when tier = 'reported'. One static edge (e3) has no quote in
-- the source dataset; its sentence doubles as the quote rather than inventing text.
insert into atlas_edges (id, from_id, to_id, type, tier, sentence, source_id, quote, retrieved_at, confidence, rule, contradicting) values
  ('e1', 'stx1b', 'stxbp1', 'shared mechanism', 'observed', 'STX1B and STXBP1 proteins bind directly to release neurotransmitter.', 'pubmed', 'Munc18-1 binds syntaxin-1 to orchestrate SNARE complex assembly.', '2026-10-02', 0.92, 'Direct binding reported in 2+ independent experimental papers', null),
  ('e2', 'stx1b', 'snap25', 'shared mechanism', 'reported', 'Both genes encode parts of the same SNARE complex.', 'orphanet', 'SNAP25 and syntaxin-1 form the core of the neuronal SNARE complex.', '2026-10-01', 0.81, 'Curated database lists both in the same pathway', null),
  ('e3', 'stxbp1', 'snap25', 'shared symptoms', 'reported', 'Both disorders commonly cause early epilepsy and developmental delay.', 'hpo', 'Both disorders commonly cause early epilepsy and developmental delay.', '2026-09-29', 0.74, '≥60% phenotype overlap in HPO annotations', null),
  ('e4', 'snap25', 'syt1', 'shared mechanism', 'inferred', 'SYT1 is the calcium sensor that triggers SNARE fusion; cohorts may overlap.', 'pubmed', null, '2026-10-02', 0.58, 'Pathway proximity model, not yet confirmed in patients', 'One case series reports distinct movement phenotypes.'),
  ('e5', 'stxbp1', 'scn2a', 'bridge', 'inferred', 'Both communities run epilepsy natural history studies with similar endpoints.', 'ctgov', null, '2026-09-30', 0.52, 'Matched endpoint terms across trial records', null),
  ('e6', 'scn2a', 'kcnq2', 'shared mechanism', 'observed', 'Both are neuronal ion channels causing early-onset epilepsy.', 'clinvar', 'Pathogenic variants associated with developmental and epileptic encephalopathy.', '2026-10-02', 0.88, 'Pathogenic variants in both genes curated for the same phenotype', null),
  ('e7', 'cacna1a-ea2', 'cacna1a-fhm1', 'same gene', 'observed', 'Same gene, opposite variant effects: kept in separate clusters.', 'clinvar', 'Loss-of-function variants cause EA2; gain-of-function variants cause FHM1.', '2026-10-02', 0.95, 'Loss vs gain of function annotations disagree', null),
  ('e8', 'stx1b', 'vamp2', 'shared mechanism', 'inferred', 'VAMP2 is the third SNARE partner, but no community or asset exists yet.', 'pubmed', null, '2026-10-02', 0.41, 'Pathway proximity only', null)
on conflict (id) do nothing;

