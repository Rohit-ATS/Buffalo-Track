-- Buffalo-Track: curated atlas snapshot.
--
-- GENERATED FILE -- do not edit by hand.
--   cd frontend && bun run seed:generate
--
-- Source of truth: frontend/src/lib/atlas-data.ts
-- Rows: 9 mechanism units, 8 edges.

insert into atlas_sources (id, name, url, pulled_at, record_count) values
  ('clinvar', 'ClinVar', 'https://www.ncbi.nlm.nih.gov/clinvar/', '2026-10-02', 412),
  ('orphanet', 'Orphanet', 'https://www.orpha.net/', '2026-10-01', 186),
  ('pubmed', 'PubMed', 'https://pubmed.ncbi.nlm.nih.gov/', '2026-10-02', 1240),
  ('ctgov', 'ClinicalTrials.gov', 'https://clinicaltrials.gov/', '2026-09-30', 58),
  ('hpo', 'Human Phenotype Ontology', 'https://hpo.jax.org/', '2026-09-29', 930)
on conflict (id) do nothing;

insert into atlas_clusters (id, name, pathway, color) values
  ('snare', 'SNARE vesicle fusion', 'Presynaptic vesicle release', 'var(--primary)'),
  ('channel', 'Ion channel excitability', 'Neuronal excitability', 'var(--highlight)'),
  ('calcium', 'P/Q calcium channel', 'Calcium signaling', 'var(--risk)')
on conflict (id) do nothing;

insert into atlas_diseases (id, name, gene, effect_class, pathway, cluster_id, importance, no_route) values
  ('stxbp1', 'STXBP1 encephalopathy', 'STXBP1', 'loss-of-function', 'Presynaptic vesicle release', 'snare', 10, false),
  ('stx1b', 'STX1B-related epilepsy', 'STX1B', 'loss-of-function', 'Presynaptic vesicle release', 'snare', 6, false),
  ('snap25', 'SNAP25 encephalopathy', 'SNAP25', 'loss-of-function', 'Presynaptic vesicle release', 'snare', 5, false),
  ('syt1', 'SYT1-associated neurodevelopmental disorder', 'SYT1', 'loss-of-function', 'Presynaptic vesicle release', 'snare', 4, false),
  ('scn2a', 'SCN2A-related disorder', 'SCN2A', 'gain-of-function', 'Neuronal excitability', 'channel', 8, false),
  ('kcnq2', 'KCNQ2 encephalopathy', 'KCNQ2', 'loss-of-function', 'Neuronal excitability', 'channel', 6, false),
  ('cacna1a-ea2', 'Episodic ataxia type 2', 'CACNA1A', 'loss-of-function', 'Calcium signaling', 'calcium', 5, false),
  ('cacna1a-fhm1', 'Familial hemiplegic migraine type 1', 'CACNA1A', 'gain-of-function', 'Calcium signaling', 'calcium', 4, false),
  ('vamp2', 'VAMP2-related neurodevelopmental disorder', 'VAMP2', 'loss-of-function', 'Presynaptic vesicle release', 'snare', 2, true)
on conflict (id) do nothing;

insert into atlas_synonyms (disease_id, synonym) values
  ('stxbp1', 'STXBP1 disorder'),
  ('stxbp1', 'Munc18-1 encephalopathy'),
  ('stxbp1', 'DEE4'),
  ('stxbp1', 'Ohtahara syndrome'),
  ('stxbp1', 'Early infantile epileptic encephalopathy'),
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

delete from atlas_open_questions;
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
  ('vamp2', 'Too few published cases', 2)
on conflict (id) do nothing;

insert into atlas_organizations (id, name, kind, url, source_id) values
  ('stxbp1-foundation', 'STXBP1 Foundation', 'patient group', 'https://www.orpha.net/', 'orphanet'),
  ('snap25-families', 'SNAP25 Families', 'patient group', 'https://www.orpha.net/', 'orphanet'),
  ('baker-gordon-syndrome-network', 'Baker-Gordon Syndrome Network', 'patient group', 'https://www.orpha.net/', 'orphanet'),
  ('familiescn2a', 'FamilieSCN2A', 'patient group', 'https://www.orpha.net/', 'orphanet'),
  ('kcnq2-cure-alliance', 'KCNQ2 Cure Alliance', 'patient group', 'https://www.orpha.net/', 'orphanet'),
  ('cacna1a-foundation', 'CACNA1A Foundation', 'patient group', 'https://www.orpha.net/', 'orphanet')
on conflict (id) do nothing;

insert into atlas_disease_organizations (disease_id, organization_id, relevance) values
  ('stxbp1', 'stxbp1-foundation', 'Supports STXBP1 encephalopathy (STXBP1 loss-of-function)'),
  ('snap25', 'snap25-families', 'Supports SNAP25 encephalopathy (SNAP25 loss-of-function)'),
  ('syt1', 'baker-gordon-syndrome-network', 'Supports SYT1-associated neurodevelopmental disorder (SYT1 loss-of-function)'),
  ('scn2a', 'familiescn2a', 'Supports SCN2A-related disorder (SCN2A gain-of-function)'),
  ('kcnq2', 'kcnq2-cure-alliance', 'Supports KCNQ2 encephalopathy (KCNQ2 loss-of-function)'),
  ('cacna1a-ea2', 'cacna1a-foundation', 'Supports Episodic ataxia type 2 (CACNA1A loss-of-function)'),
  ('cacna1a-fhm1', 'cacna1a-foundation', 'Supports Familial hemiplegic migraine type 1 (CACNA1A gain-of-function)')
on conflict (disease_id, organization_id) do nothing;

insert into atlas_assets (id, disease_id, kind, name, owner, url, reusable_because) values
  ('stxbp1-natural-history-study-0', 'stxbp1', 'natural history study', 'STXBP1 Natural History Study', 'STXBP1 Foundation', 'https://clinicaltrials.gov/', 'Built for STXBP1 encephalopathy; may transfer to units sharing Presynaptic vesicle release'),
  ('stxbp1-registry-1', 'stxbp1', 'registry', 'STXBP1 Global Registry', 'STXBP1 Foundation', 'https://www.stxbp1disorders.org/', 'Built for STXBP1 encephalopathy; may transfer to units sharing Presynaptic vesicle release'),
  ('stxbp1-model-2', 'stxbp1', 'model', 'Stxbp1 haploinsufficient mouse', 'Academic consortium', 'https://pubmed.ncbi.nlm.nih.gov/', 'Built for STXBP1 encephalopathy; may transfer to units sharing Presynaptic vesicle release'),
  ('stx1b-registry-0', 'stx1b', 'registry', 'Small family registry (draft)', 'Parent volunteers', 'https://www.orpha.net/', 'Built for STX1B-related epilepsy; may transfer to units sharing Presynaptic vesicle release'),
  ('snap25-registry-0', 'snap25', 'registry', 'SNARE disorders registry', 'SNAP25 Families', 'https://www.orpha.net/', 'Built for SNAP25 encephalopathy; may transfer to units sharing Presynaptic vesicle release'),
  ('snap25-natural-history-study-1', 'snap25', 'natural history study', 'SNARE natural history pilot', 'SNAP25 Families', 'https://clinicaltrials.gov/', 'Built for SNAP25 encephalopathy; may transfer to units sharing Presynaptic vesicle release'),
  ('syt1-registry-0', 'syt1', 'registry', 'SYT1 registry', 'Baker-Gordon Syndrome Network', 'https://www.orpha.net/', 'Built for SYT1-associated neurodevelopmental disorder; may transfer to units sharing Presynaptic vesicle release'),
  ('scn2a-trial-0', 'scn2a', 'trial', 'Antisense oligonucleotide trial', 'Biotech sponsor', 'https://clinicaltrials.gov/', 'Built for SCN2A-related disorder; may transfer to units sharing Neuronal excitability'),
  ('scn2a-registry-1', 'scn2a', 'registry', 'SCN2A Registry', 'FamilieSCN2A', 'https://www.orpha.net/', 'Built for SCN2A-related disorder; may transfer to units sharing Neuronal excitability'),
  ('kcnq2-natural-history-study-0', 'kcnq2', 'natural history study', 'KCNQ2 natural history', 'KCNQ2 Cure Alliance', 'https://clinicaltrials.gov/', 'Built for KCNQ2 encephalopathy; may transfer to units sharing Neuronal excitability'),
  ('cacna1a-ea2-registry-0', 'cacna1a-ea2', 'registry', 'CACNA1A registry', 'CACNA1A Foundation', 'https://www.orpha.net/', 'Built for Episodic ataxia type 2; may transfer to units sharing Calcium signaling'),
  ('cacna1a-fhm1-registry-0', 'cacna1a-fhm1', 'registry', 'CACNA1A registry', 'CACNA1A Foundation', 'https://www.orpha.net/', 'Built for Familial hemiplegic migraine type 1; may transfer to units sharing Calcium signaling'),
  ('cacna1a-fhm1-model-1', 'cacna1a-fhm1', 'model', 'FHM1 knock-in mouse', 'Academic lab', 'https://pubmed.ncbi.nlm.nih.gov/', 'Built for Familial hemiplegic migraine type 1; may transfer to units sharing Calcium signaling')
on conflict (id) do nothing;

insert into atlas_trials (id, nct_id, name, status, study_type, sponsor, url) values
  ('stxbp1-natural-history-study-0', null, 'STXBP1 Natural History Study', 'unknown', 'observational', 'STXBP1 Foundation', 'https://clinicaltrials.gov/'),
  ('snap25-natural-history-study-1', null, 'SNARE natural history pilot', 'unknown', 'observational', 'SNAP25 Families', 'https://clinicaltrials.gov/'),
  ('scn2a-trial-0', null, 'Antisense oligonucleotide trial', 'unknown', 'interventional', 'Biotech sponsor', 'https://clinicaltrials.gov/'),
  ('kcnq2-natural-history-study-0', null, 'KCNQ2 natural history', 'unknown', 'observational', 'KCNQ2 Cure Alliance', 'https://clinicaltrials.gov/')
on conflict (id) do nothing;

insert into atlas_trial_diseases (trial_id, disease_id) values
  ('stxbp1-natural-history-study-0', 'stxbp1'),
  ('snap25-natural-history-study-1', 'snap25'),
  ('scn2a-trial-0', 'scn2a'),
  ('kcnq2-natural-history-study-0', 'kcnq2')
on conflict (trial_id, disease_id) do nothing;

delete from atlas_contacts;
insert into atlas_contacts (disease_id, role, name, org, source_id, url) values
  ('stxbp1', 'patient group', 'STXBP1 Foundation', 'Family foundation', 'orphanet', 'https://www.orpha.net/'),
  ('stxbp1', 'lead investigator', 'Natural history study PI', 'Children''s hospital', 'ctgov', 'https://clinicaltrials.gov/'),
  ('stx1b', 'lead investigator', 'STX1B case-series author', 'University neurology dept.', 'pubmed', 'https://pubmed.ncbi.nlm.nih.gov/'),
  ('snap25', 'patient group', 'SNAP25 Families', 'Parent network', 'orphanet', 'https://www.orpha.net/'),
  ('syt1', 'patient group', 'Baker-Gordon Syndrome Network', 'Parent network', 'orphanet', 'https://www.orpha.net/'),
  ('scn2a', 'patient group', 'FamilieSCN2A', 'Family foundation', 'orphanet', 'https://www.orpha.net/'),
  ('kcnq2', 'patient group', 'KCNQ2 Cure Alliance', 'Family foundation', 'orphanet', 'https://www.orpha.net/'),
  ('cacna1a-ea2', 'patient group', 'CACNA1A Foundation', 'Family foundation', 'orphanet', 'https://www.orpha.net/'),
  ('cacna1a-fhm1', 'patient group', 'CACNA1A Foundation', 'Family foundation', 'orphanet', 'https://www.orpha.net/')
on conflict (id) do nothing;

insert into atlas_researchers (id, name, institution, orcid, unresolved, pathway, publications, trials, grants) values
  ('dr-a-lindqvist', 'Dr. A. Lindqvist', 'Karolinska Institutet', null, true, 'Presynaptic vesicle release', 1, 0, 0),
  ('dr-m-okafor', 'Dr. M. Okafor', 'UCL Queen Square', null, true, 'Presynaptic vesicle release', 1, 1, 0),
  ('dr-r-chen', 'Dr. R. Chen', 'Stanford University', null, true, 'Presynaptic vesicle release', 1, 0, 0),
  ('dr-p-haddad', 'Dr. P. Haddad', 'Boston Children''s Hospital', null, true, 'Neuronal excitability', 1, 1, 0),
  ('dr-s-bianchi', 'Dr. S. Bianchi', 'University of Milan', null, true, 'Neuronal excitability', 1, 1, 0)
on conflict (id) do nothing;

insert into atlas_researcher_diseases (researcher_id, disease_id, basis) values
  ('dr-a-lindqvist', 'stxbp1', 'authored'),
  ('dr-m-okafor', 'snap25', 'authored'),
  ('dr-r-chen', 'syt1', 'authored'),
  ('dr-p-haddad', 'kcnq2', 'authored'),
  ('dr-s-bianchi', 'scn2a', 'authored')
on conflict (researcher_id, disease_id, basis) do nothing;

insert into atlas_edges (id, from_id, to_id, type, tier, sentence, source_id, quote, retrieved_at, confidence, rule, contradicting, quote_verified, method) values
  ('e1', 'stx1b', 'stxbp1', 'shared mechanism', 'observed', 'STX1B and STXBP1 proteins bind directly to release neurotransmitter.', 'pubmed', 'Munc18-1 binds syntaxin-1 to orchestrate SNARE complex assembly.', '2026-10-02', 0.92, 'Direct binding reported in 2+ independent experimental papers', null, false, 'curated snapshot'),
  ('e2', 'stx1b', 'snap25', 'shared mechanism', 'reported', 'Both genes encode parts of the same SNARE complex.', 'orphanet', 'SNAP25 and syntaxin-1 form the core of the neuronal SNARE complex.', '2026-10-01', 0.81, 'Curated database lists both in the same pathway', null, false, 'curated snapshot'),
  ('e3', 'stxbp1', 'snap25', 'shared symptoms', 'inferred', 'Both disorders commonly cause early epilepsy and developmental delay.', 'hpo', null, '2026-09-29', 0.74, '≥60% phenotype overlap in HPO annotations', null, false, 'curated snapshot'),
  ('e4', 'snap25', 'syt1', 'shared mechanism', 'inferred', 'SYT1 is the calcium sensor that triggers SNARE fusion; cohorts may overlap.', 'pubmed', null, '2026-10-02', 0.58, 'Pathway proximity model, not yet confirmed in patients', 'One case series reports distinct movement phenotypes.', false, 'curated snapshot'),
  ('e5', 'stxbp1', 'scn2a', 'bridge', 'inferred', 'Both communities run epilepsy natural history studies with similar endpoints.', 'ctgov', null, '2026-09-30', 0.52, 'Matched endpoint terms across trial records', null, false, 'curated snapshot'),
  ('e6', 'scn2a', 'kcnq2', 'shared mechanism', 'observed', 'Both are neuronal ion channels causing early-onset epilepsy.', 'clinvar', 'Pathogenic variants associated with developmental and epileptic encephalopathy.', '2026-10-02', 0.88, 'Pathogenic variants in both genes curated for the same phenotype', null, false, 'curated snapshot'),
  ('e7', 'cacna1a-ea2', 'cacna1a-fhm1', 'same gene', 'observed', 'Same gene, opposite variant effects: kept in separate clusters.', 'clinvar', 'Loss-of-function variants cause EA2; gain-of-function variants cause FHM1.', '2026-10-02', 0.95, 'Loss vs gain of function annotations disagree', null, false, 'curated snapshot'),
  ('e8', 'stx1b', 'vamp2', 'shared mechanism', 'inferred', 'VAMP2 is the third SNARE partner, but no community or asset exists yet.', 'pubmed', null, '2026-10-02', 0.41, 'Pathway proximity only', null, false, 'curated snapshot')
on conflict (id) do nothing;

insert into atlas_similarity (a_id, b_id, mechanism_score, phenotype_score, combined_score, shared_pathways, shared_phenotypes, blocked_reason) values
  ('stxbp1', 'stx1b', 1, 0.6667, 0.8667, array['Presynaptic vesicle release']::text[], array['epilepsy', 'developmental delay']::text[], null),
  ('stxbp1', 'snap25', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['epilepsy']::text[], null),
  ('stxbp1', 'syt1', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['developmental delay']::text[], null),
  ('stxbp1', 'scn2a', 0.1, 0.3333, 0.1933, '{}', array['epilepsy']::text[], null),
  ('stxbp1', 'kcnq2', 0.4, 0.3333, 0.3733, '{}', array['developmental delay']::text[], null),
  ('stxbp1', 'cacna1a-ea2', 0.4, 0, 0.24, '{}', '{}', null),
  ('stxbp1', 'cacna1a-fhm1', 0.1, 0, 0.06, '{}', '{}', null),
  ('stxbp1', 'vamp2', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['developmental delay']::text[], null),
  ('stx1b', 'stxbp1', 1, 0.6667, 0.8667, array['Presynaptic vesicle release']::text[], array['epilepsy', 'developmental delay']::text[], null),
  ('stx1b', 'snap25', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['epilepsy']::text[], null),
  ('stx1b', 'syt1', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['developmental delay']::text[], null),
  ('stx1b', 'scn2a', 0.1, 0.3333, 0.1933, '{}', array['epilepsy']::text[], null),
  ('stx1b', 'kcnq2', 0.4, 0.3333, 0.3733, '{}', array['developmental delay']::text[], null),
  ('stx1b', 'cacna1a-ea2', 0.4, 0, 0.24, '{}', '{}', null),
  ('stx1b', 'cacna1a-fhm1', 0.1, 0, 0.06, '{}', '{}', null),
  ('stx1b', 'vamp2', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['developmental delay']::text[], null),
  ('snap25', 'stxbp1', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['epilepsy']::text[], null),
  ('snap25', 'stx1b', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['epilepsy']::text[], null),
  ('snap25', 'syt1', 1, 0, 0.6, array['Presynaptic vesicle release']::text[], '{}', null),
  ('snap25', 'scn2a', 0.1, 0.3333, 0.1933, '{}', array['epilepsy']::text[], null),
  ('snap25', 'kcnq2', 0.4, 0, 0.24, '{}', '{}', null),
  ('snap25', 'cacna1a-ea2', 0.4, 0, 0.24, '{}', '{}', null),
  ('snap25', 'cacna1a-fhm1', 0.1, 0.3333, 0.1933, '{}', array['ataxia']::text[], null),
  ('snap25', 'vamp2', 1, 0, 0.6, array['Presynaptic vesicle release']::text[], '{}', null),
  ('syt1', 'stxbp1', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['developmental delay']::text[], null),
  ('syt1', 'stx1b', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['developmental delay']::text[], null),
  ('syt1', 'snap25', 1, 0, 0.6, array['Presynaptic vesicle release']::text[], '{}', null),
  ('syt1', 'scn2a', 0.1, 0, 0.06, '{}', '{}', null),
  ('syt1', 'kcnq2', 0.4, 0.5, 0.44, '{}', array['developmental delay']::text[], null),
  ('syt1', 'cacna1a-ea2', 0.4, 0, 0.24, '{}', '{}', null),
  ('syt1', 'cacna1a-fhm1', 0.1, 0, 0.06, '{}', '{}', null),
  ('syt1', 'vamp2', 1, 0.5, 0.8, array['Presynaptic vesicle release']::text[], array['developmental delay']::text[], null),
  ('scn2a', 'stxbp1', 0.1, 0.3333, 0.1933, '{}', array['epilepsy']::text[], null),
  ('scn2a', 'stx1b', 0.1, 0.3333, 0.1933, '{}', array['epilepsy']::text[], null),
  ('scn2a', 'snap25', 0.1, 0.3333, 0.1933, '{}', array['epilepsy']::text[], null),
  ('scn2a', 'syt1', 0.1, 0, 0.06, '{}', '{}', null),
  ('scn2a', 'kcnq2', 0.7, 0, 0.42, array['Neuronal excitability']::text[], '{}', null),
  ('scn2a', 'cacna1a-ea2', 0.1, 0, 0.06, '{}', '{}', null),
  ('scn2a', 'cacna1a-fhm1', 0.4, 0, 0.24, '{}', '{}', null),
  ('scn2a', 'vamp2', 0.1, 0, 0.06, '{}', '{}', null),
  ('kcnq2', 'stxbp1', 0.4, 0.3333, 0.3733, '{}', array['developmental delay']::text[], null),
  ('kcnq2', 'stx1b', 0.4, 0.3333, 0.3733, '{}', array['developmental delay']::text[], null),
  ('kcnq2', 'snap25', 0.4, 0, 0.24, '{}', '{}', null),
  ('kcnq2', 'syt1', 0.4, 0.5, 0.44, '{}', array['developmental delay']::text[], null),
  ('kcnq2', 'scn2a', 0.7, 0, 0.42, array['Neuronal excitability']::text[], '{}', null),
  ('kcnq2', 'cacna1a-ea2', 0.4, 0, 0.24, '{}', '{}', null),
  ('kcnq2', 'cacna1a-fhm1', 0.1, 0, 0.06, '{}', '{}', null),
  ('kcnq2', 'vamp2', 0.4, 0.5, 0.44, '{}', array['developmental delay']::text[], null),
  ('cacna1a-ea2', 'stxbp1', 0.4, 0, 0.24, '{}', '{}', null),
  ('cacna1a-ea2', 'stx1b', 0.4, 0, 0.24, '{}', '{}', null),
  ('cacna1a-ea2', 'snap25', 0.4, 0, 0.24, '{}', '{}', null),
  ('cacna1a-ea2', 'syt1', 0.4, 0, 0.24, '{}', '{}', null),
  ('cacna1a-ea2', 'scn2a', 0.1, 0, 0.06, '{}', '{}', null),
  ('cacna1a-ea2', 'kcnq2', 0.4, 0, 0.24, '{}', '{}', null),
  ('cacna1a-ea2', 'cacna1a-fhm1', 0.7, 0, 0.42, array['Calcium signaling']::text[], '{}', 'Same gene (CACNA1A) but different effect class: loss-of-function vs gain-of-function. Mechanism units are never merged across effect classes.'),
  ('cacna1a-ea2', 'vamp2', 0.4, 0, 0.24, '{}', '{}', null),
  ('cacna1a-fhm1', 'stxbp1', 0.1, 0, 0.06, '{}', '{}', null),
  ('cacna1a-fhm1', 'stx1b', 0.1, 0, 0.06, '{}', '{}', null),
  ('cacna1a-fhm1', 'snap25', 0.1, 0.3333, 0.1933, '{}', array['ataxia']::text[], null),
  ('cacna1a-fhm1', 'syt1', 0.1, 0, 0.06, '{}', '{}', null),
  ('cacna1a-fhm1', 'scn2a', 0.4, 0, 0.24, '{}', '{}', null),
  ('cacna1a-fhm1', 'kcnq2', 0.1, 0, 0.06, '{}', '{}', null),
  ('cacna1a-fhm1', 'cacna1a-ea2', 0.7, 0, 0.42, array['Calcium signaling']::text[], '{}', 'Same gene (CACNA1A) but different effect class: gain-of-function vs loss-of-function. Mechanism units are never merged across effect classes.'),
  ('cacna1a-fhm1', 'vamp2', 0.1, 0, 0.06, '{}', '{}', null),
  ('vamp2', 'stxbp1', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['developmental delay']::text[], null),
  ('vamp2', 'stx1b', 1, 0.3333, 0.7333, array['Presynaptic vesicle release']::text[], array['developmental delay']::text[], null),
  ('vamp2', 'snap25', 1, 0, 0.6, array['Presynaptic vesicle release']::text[], '{}', null),
  ('vamp2', 'syt1', 1, 0.5, 0.8, array['Presynaptic vesicle release']::text[], array['developmental delay']::text[], null),
  ('vamp2', 'scn2a', 0.1, 0, 0.06, '{}', '{}', null),
  ('vamp2', 'kcnq2', 0.4, 0.5, 0.44, '{}', array['developmental delay']::text[], null),
  ('vamp2', 'cacna1a-ea2', 0.4, 0, 0.24, '{}', '{}', null),
  ('vamp2', 'cacna1a-fhm1', 0.1, 0, 0.06, '{}', '{}', null)
on conflict (a_id, b_id) do nothing;

insert into atlas_metrics (key, label, value, unit, detail) values
  ('quote_coverage', 'Reported edges carrying a verbatim quote', 1, 'ratio', '1 of 1 reported edges'),
  ('quote_verified', 'Quotes checked verbatim against source text', 0, 'ratio', 'Requires the extraction pipeline; snapshot quotes are hand-entered and not yet machine-verified'),
  ('contradiction_coverage', 'Edges recording contradicting evidence', 0.125, 'ratio', '1 of 8 edges'),
  ('observed_share', 'Share of edges at the observed tier', 0.375, 'ratio', 'Structured database records rather than extracted claims')
on conflict (key) do nothing;
