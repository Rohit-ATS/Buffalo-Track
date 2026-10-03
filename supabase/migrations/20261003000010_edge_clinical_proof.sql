-- Phase 3: clinical proof is distinct from an edge's evidence tier.
-- `tier` says how a connection was established; this says whether its receipt
-- includes direct clinical evidence.
alter table atlas_edges
  add column if not exists clinical_proof boolean not null default false;

comment on column atlas_edges.clinical_proof is
  'True only when this edge has direct clinical evidence. Independent from evidence tier.';
