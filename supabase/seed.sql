-- Buffalo-Track: demo seed data.
--
-- A small, illustrative slice of a neurodevelopmental graph: genes act in a
-- shared mechanism, mechanisms link disorders that carry different names, and
-- communities hold assets another family could reuse. Mirrors the journey the
-- landing page describes.
--
-- Fixed UUIDs + `on conflict do nothing` make this safe to run repeatedly.
-- `embedding` is left null; backfill it with your embedding model.

-- ---------------------------------------------------------------- nodes
insert into nodes (id, type, name, attributes) values
  -- genes
  ('a0000000-0000-4000-8000-000000000001', 'gene', 'STXBP1',  '{"symbol":"STXBP1","chromosome":"9q34.11"}'),
  ('a0000000-0000-4000-8000-000000000002', 'gene', 'STX1B',   '{"symbol":"STX1B","chromosome":"16p11.2"}'),
  ('a0000000-0000-4000-8000-000000000003', 'gene', 'SNAP25',  '{"symbol":"SNAP25","chromosome":"20p12.2"}'),
  ('a0000000-0000-4000-8000-000000000004', 'gene', 'SYT1',    '{"symbol":"SYT1","chromosome":"12q21.2"}'),
  ('a0000000-0000-4000-8000-000000000005', 'gene', 'CACNA1A', '{"symbol":"CACNA1A","chromosome":"19p13.13"}'),

  -- mechanisms
  ('b0000000-0000-4000-8000-000000000001', 'mechanism', 'Presynaptic vesicle fusion',       '{"complex":"SNARE"}'),
  ('b0000000-0000-4000-8000-000000000002', 'mechanism', 'Calcium channel loss-of-function', '{"channel":"P/Q-type"}'),
  ('b0000000-0000-4000-8000-000000000003', 'mechanism', 'Calcium channel gain-of-function', '{"channel":"P/Q-type"}'),

  -- disorders
  ('c0000000-0000-4000-8000-000000000001', 'disorder', 'STXBP1-related disorder',                   '{"onset":"infantile"}'),
  ('c0000000-0000-4000-8000-000000000002', 'disorder', 'STX1B-related epilepsy',                    '{"onset":"childhood"}'),
  ('c0000000-0000-4000-8000-000000000003', 'disorder', 'SNAP25-related developmental disorder',     '{"onset":"infantile"}'),
  ('c0000000-0000-4000-8000-000000000004', 'disorder', 'SYT1-associated neurodevelopmental disorder', '{"onset":"infantile"}'),
  ('c0000000-0000-4000-8000-000000000005', 'disorder', 'Episodic ataxia type 2',                    '{"onset":"variable"}'),
  ('c0000000-0000-4000-8000-000000000006', 'disorder', 'Familial hemiplegic migraine type 1',       '{"onset":"variable"}'),

  -- communities
  ('d0000000-0000-4000-8000-000000000001', 'organization', 'STXBP1 Foundation',  '{"founded":2017}'),
  ('d0000000-0000-4000-8000-000000000002', 'organization', 'CACNA1A Foundation', '{"founded":2019}'),

  -- assets a community has already built
  ('e0000000-0000-4000-8000-000000000001', 'asset', 'STXBP1 natural history study', '{"kind":"natural_history_study"}'),
  ('e0000000-0000-4000-8000-000000000002', 'asset', 'Patient-powered registry',     '{"kind":"registry"}'),
  ('e0000000-0000-4000-8000-000000000003', 'asset', 'Sourced collaboration brief',  '{"kind":"brief"}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- edges
insert into edges (id, source_id, target_id, type, weight, attributes) values
  -- gene acts in mechanism
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'acts_in', 0.95, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'acts_in', 0.93, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'acts_in', 0.92, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'acts_in', 0.88, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'acts_in', 0.90, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000003', 'acts_in', 0.90, '{"tier":"observed"}'),

  -- gene causes disorder
  ('f0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'causes', 0.98, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'causes', 0.96, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'causes', 0.94, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'causes', 0.91, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', 'causes', 0.95, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000006', 'causes', 0.95, '{"tier":"observed"}'),

  -- disorders that share a mechanism unit (the connection the atlas exists to surface)
  ('f0000000-0000-4000-8000-000000000021', 'c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'shares_mechanism', 0.86, '{"tier":"inferred","via":"SNARE"}'),
  ('f0000000-0000-4000-8000-000000000022', 'c0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'shares_mechanism', 0.82, '{"tier":"inferred","via":"SNARE"}'),
  ('f0000000-0000-4000-8000-000000000023', 'c0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'shares_mechanism', 0.79, '{"tier":"inferred","via":"SNARE"}'),

  -- community and assets
  ('f0000000-0000-4000-8000-000000000031', 'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'supported_by', 0.99, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000032', 'c0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'supported_by', 0.97, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000033', 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'maintains', 0.98, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000034', 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'maintains', 0.96, '{"tier":"observed"}'),
  ('f0000000-0000-4000-8000-000000000035', 'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', 'informs', 0.75, '{"tier":"inferred"}')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- evidence
-- Node-level evidence: what the atlas shows as a "receipt" next to an entity.
insert into evidence (id, node_id, content, source_url, confidence, metadata) values
  ('09000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'STXBP1-related disorder presents with early-onset epilepsy and developmental delay; the gene encodes Munc18-1, required for synaptic vesicle fusion.',
   'https://www.ncbi.nlm.nih.gov/books/NBK1116/', 0.92, '{"tier":"reported"}'),
  ('09000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
   'An established foundation maintains a natural history study open to newly diagnosed families.',
   'https://www.stxbp1disorders.org/', 0.88, '{"tier":"reported"}'),
  ('09000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Munc18-1 binds syntaxin-1 and is essential for priming vesicles before calcium-triggered release.',
   'https://www.uniprot.org/uniprotkb/P61764/entry', 0.90, '{"tier":"observed"}'),
  ('09000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002',
   'STX1B variants cause fever-associated epilepsy syndromes; syntaxin-1B is a core SNARE component.',
   'https://www.ncbi.nlm.nih.gov/gene/112755', 0.85, '{"tier":"reported"}'),
  ('09000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005',
   'CACNA1A variants split into loss-of-function and gain-of-function mechanism units with opposite treatment implications.',
   'https://www.ncbi.nlm.nih.gov/gene/773', 0.80, '{"tier":"reported"}')
on conflict (id) do nothing;

-- Edge-level evidence: the receipt behind a specific connection.
insert into evidence (id, edge_id, content, source_url, confidence, metadata) values
  ('0a000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000021',
   'Both disorders converge on presynaptic vesicle fusion via the SNARE complex, making shared outcome measures plausible.',
   'https://pubmed.ncbi.nlm.nih.gov/', 0.78, '{"tier":"inferred","needs_expert_review":true}'),
  ('0a000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000022',
   'SNAP25 is a SNARE component alongside STXBP1-regulated syntaxin, placing both in the same mechanism unit.',
   'https://pubmed.ncbi.nlm.nih.gov/', 0.74, '{"tier":"inferred","needs_expert_review":true}'),
  ('0a000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000031',
   'The foundation publicly lists STXBP1-related disorder as its sole disease focus.',
   'https://www.stxbp1disorders.org/', 0.95, '{"tier":"observed"}'),
  ('0a000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000033',
   'Study enrollment and protocol are described on the foundation research page.',
   'https://www.stxbp1disorders.org/', 0.93, '{"tier":"reported"}')
on conflict (id) do nothing;
