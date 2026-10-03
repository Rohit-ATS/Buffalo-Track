-- Buffalo-Track: initial schema (nodes, edges, evidence)

-- 1. Extensions
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";     -- pgvector

-- 2. nodes: the entities in the graph
create table if not exists nodes (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,                       -- e.g. 'person', 'org', 'event'
  name        text not null,
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists nodes_type_idx on nodes (type);
create index if not exists nodes_name_trgm_idx on nodes using gin (to_tsvector('english', name));
create index if not exists nodes_attributes_idx on nodes using gin (attributes);

-- 3. edges: directed, typed relationships between nodes
create table if not exists edges (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references nodes(id) on delete cascade,
  target_id   uuid not null references nodes(id) on delete cascade,
  type        text not null,                       -- e.g. 'works_at', 'located_in'
  weight      double precision not null default 1.0,
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint edges_no_self_loop check (source_id <> target_id),
  constraint edges_unique unique (source_id, target_id, type)
);

create index if not exists edges_source_idx on edges (source_id);
create index if not exists edges_target_idx on edges (target_id);
create index if not exists edges_type_idx   on edges (type);

-- 4. evidence: source material backing a node or an edge, with embeddings
create table if not exists evidence (
  id          uuid primary key default gen_random_uuid(),
  node_id     uuid references nodes(id) on delete cascade,
  edge_id     uuid references edges(id) on delete cascade,
  content     text not null,
  source_url  text,
  confidence  real check (confidence >= 0 and confidence <= 1),
  embedding   vector(1536),                        -- match your embedding model
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint evidence_has_target check (node_id is not null or edge_id is not null)
);

create index if not exists evidence_node_idx on evidence (node_id);
create index if not exists evidence_edge_idx on evidence (edge_id);

-- Vector similarity index (cosine). Build after you have rows loaded.
create index if not exists evidence_embedding_idx
  on evidence using hnsw (embedding vector_cosine_ops);

-- 5. keep updated_at fresh on nodes
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists nodes_set_updated_at on nodes;
create trigger nodes_set_updated_at
  before update on nodes
  for each row execute function set_updated_at();

-- 6. Row Level Security: locked down by default.
--    service_role bypasses RLS; add policies when you add auth.
alter table nodes    enable row level security;
alter table edges    enable row level security;
alter table evidence enable row level security;
