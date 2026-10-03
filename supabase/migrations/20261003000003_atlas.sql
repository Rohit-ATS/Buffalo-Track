-- Buffalo-Track: the atlas domain schema.
--
-- 0001_init.sql holds a generic nodes/edges/evidence store. This migration adds
-- the typed tables the product actually queries, with the semantics the plan
-- requires:
--
--   * The clustering node is a MECHANISM UNIT: gene x effect class. CACNA1A
--     loss-of-function and CACNA1A gain-of-function are two rows, never one.
--   * Every edge carries a receipt: tier, source, record id, url, retrieval
--     date, confidence AND the rule that set it, plus a verbatim quote for
--     model-extracted claims and a link to contradicting evidence.
--   * Provenance is not optional: source, record_id, url, retrieved_at.
--
-- These are public reference tables, so anon gets SELECT via RLS policies and
-- the client may read them directly. Writes stay with the service role.

-- ----------------------------------------------------------------- enums
do $$ begin
  create type evidence_tier as enum ('observed', 'reported', 'inferred');
exception when duplicate_object then null; end $$;

do $$ begin
  -- The effect half of a mechanism unit.
  create type effect_class as enum (
    'loss of function',
    'gain of function',
    'dominant negative',
    'repeat expansion',
    'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_kind as enum (
    'registry', 'natural history study', 'trial', 'model',
    'biomarker', 'biobank', 'outcome measure', 'dataset', 'protocol'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_role as enum ('patient group', 'lead investigator');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------- sources
-- One row per upstream dataset, with the version and date it was pulled.
create table if not exists atlas_sources (
  id            text primary key,
  name          text not null,
  url           text not null,
  pulled_at     date not null,
  record_count  integer not null default 0,
  dataset_version text,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------- clusters
create table if not exists atlas_clusters (
  id        text primary key,
  name      text not null,
  pathway   text not null,
  color     text not null default 'var(--primary)',
  -- Stability: how often member pairs land together across reruns.
  stability real check (stability is null or (stability >= 0 and stability <= 1)),
  seeds     integer,
  resolutions integer
);

-- ----------------------------------------------------------------- mechanism units
-- The core node. `effect_class` is what keeps one gene's opposite mechanisms
-- apart, which is the whole point of the counterexample view.
create table if not exists atlas_diseases (
  id           text primary key,
  name         text not null,
  gene         text not null,
  effect_class effect_class not null,
  pathway      text not null,
  cluster_id   text references atlas_clusters (id) on delete set null,
  mondo_id     text,
  importance   integer not null default 1,
  -- True when the atlas has no supported route out of this unit: the gap state.
  no_route     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists atlas_diseases_gene_idx on atlas_diseases (gene);
create index if not exists atlas_diseases_cluster_idx on atlas_diseases (cluster_id);
create index if not exists atlas_diseases_effect_idx on atlas_diseases (effect_class);

-- Synonyms drive "You searched X, showing Y".
create table if not exists atlas_synonyms (
  disease_id text not null references atlas_diseases (id) on delete cascade,
  synonym    text not null,
  primary key (disease_id, synonym)
);
create index if not exists atlas_synonyms_lower_idx on atlas_synonyms (lower(synonym));

create table if not exists atlas_symptoms (
  disease_id text not null references atlas_diseases (id) on delete cascade,
  symptom    text not null,
  -- HPO information content: "seizure" is near-useless for similarity.
  info_content real,
  hpo_id     text,
  primary key (disease_id, symptom)
);
create index if not exists atlas_symptoms_lower_idx on atlas_symptoms (lower(symptom));

create table if not exists atlas_open_questions (
  id         bigserial primary key,
  disease_id text not null references atlas_diseases (id) on delete cascade,
  question   text not null,
  position   integer not null default 0
);
create index if not exists atlas_open_questions_disease_idx on atlas_open_questions (disease_id);

-- ----------------------------------------------------------------- organizations
create table if not exists atlas_organizations (
  id         text primary key,
  name       text not null,
  kind       text not null default 'patient group',
  url        text,
  registry_url text,
  contact_url  text,
  source_id  text references atlas_sources (id) on delete set null,
  founded    integer
);

create table if not exists atlas_disease_organizations (
  disease_id      text not null references atlas_diseases (id) on delete cascade,
  organization_id text not null references atlas_organizations (id) on delete cascade,
  -- Why this organization is relevant to this unit.
  relevance  text,
  primary key (disease_id, organization_id)
);

-- ----------------------------------------------------------------- assets
-- What another community has already built and might be reusable.
create table if not exists atlas_assets (
  id          text primary key,
  disease_id  text not null references atlas_diseases (id) on delete cascade,
  kind        asset_kind not null,
  name        text not null,
  owner       text not null,
  url         text not null,
  source_id   text references atlas_sources (id) on delete set null,
  -- Why it might transfer, and what would have to be checked first.
  reusable_because text,
  retrieved_at date
);
create index if not exists atlas_assets_disease_idx on atlas_assets (disease_id);
create index if not exists atlas_assets_kind_idx on atlas_assets (kind);

-- ----------------------------------------------------------------- trials
create table if not exists atlas_trials (
  id           text primary key,
  -- Null until the record is matched to a real ClinicalTrials.gov entry. Never
  -- render a placeholder as an NCT number.
  nct_id       text,
  name         text not null,
  status       text,
  study_type   text,                      -- observational studies are assets too
  intervention text,
  sponsor      text,
  investigator text,
  eligibility  text,
  start_date   date,
  url          text,
  source_id    text references atlas_sources (id) on delete set null,
  retrieved_at date
);

create table if not exists atlas_trial_diseases (
  trial_id   text not null references atlas_trials (id) on delete cascade,
  disease_id text not null references atlas_diseases (id) on delete cascade,
  primary key (trial_id, disease_id)
);

-- ----------------------------------------------------------------- contacts
create table if not exists atlas_contacts (
  id         bigserial primary key,
  disease_id text not null references atlas_diseases (id) on delete cascade,
  role       contact_role not null,
  name       text not null,
  org        text not null,
  source_id  text references atlas_sources (id) on delete set null,
  url        text not null
);
create index if not exists atlas_contacts_disease_idx on atlas_contacts (disease_id);

-- ----------------------------------------------------------------- researchers
create table if not exists atlas_researchers (
  id          text primary key,
  name        text not null,
  institution text,
  orcid       text,
  -- No ORCID means the identity is a name+institution guess. Never present an
  -- unresolved person as a confirmed contact.
  unresolved  boolean not null default false,
  pathway     text,
  publications integer not null default 0,
  trials      integer not null default 0,
  grants      integer not null default 0,
  bridge_score real
);

create table if not exists atlas_researcher_diseases (
  researcher_id text not null references atlas_researchers (id) on delete cascade,
  disease_id    text not null references atlas_diseases (id) on delete cascade,
  -- How we know: authored | trial lead | grant lead
  basis         text not null default 'authored',
  primary key (researcher_id, disease_id, basis)
);

-- ----------------------------------------------------------------- edges
-- The receipt. Mirrors the plan's edge record field for field.
create table if not exists atlas_edges (
  id             text primary key,
  from_id        text not null references atlas_diseases (id) on delete cascade,
  to_id          text not null references atlas_diseases (id) on delete cascade,
  type           text not null,            -- shared mechanism, shared trial, ...
  tier           evidence_tier not null,
  sentence       text not null,            -- plain-language claim
  source_id      text not null references atlas_sources (id) on delete restrict,
  record_id      text,                     -- PMID, NCT, project number
  url            text,
  quote          text,                     -- verbatim span, required for reported
  retrieved_at   date not null,
  confidence     real not null check (confidence >= 0 and confidence <= 1),
  rule           text not null,            -- why confidence is that number
  contradicting  text,                     -- free-text summary of conflict
  contradicted_by text references atlas_edges (id) on delete set null,
  -- Quote verification: a reported claim only becomes an edge if its quote was
  -- found verbatim in the source text.
  quote_verified boolean not null default false,
  method         text,                     -- loader name, or model + prompt version
  constraint atlas_edges_no_self_loop check (from_id <> to_id),
  constraint atlas_edges_reported_needs_quote
    check (tier <> 'reported' or quote is not null)
);

create index if not exists atlas_edges_from_idx on atlas_edges (from_id);
create index if not exists atlas_edges_to_idx on atlas_edges (to_id);
create index if not exists atlas_edges_tier_idx on atlas_edges (tier);
create index if not exists atlas_edges_type_idx on atlas_edges (type);

-- ----------------------------------------------------------------- quality metrics
-- The numbers the methods page prints: rejection rate, audit precision, etc.
create table if not exists atlas_metrics (
  key          text primary key,
  label        text not null,
  value        numeric not null,
  unit         text not null default 'ratio',
  detail       text,
  computed_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------- similarity
-- Precomputed so the demo never waits on a computation. Components stay
-- separate: the interface must show which half drives a link.
create table if not exists atlas_similarity (
  a_id            text not null references atlas_diseases (id) on delete cascade,
  b_id            text not null references atlas_diseases (id) on delete cascade,
  mechanism_score real not null check (mechanism_score >= 0 and mechanism_score <= 1),
  phenotype_score real not null check (phenotype_score >= 0 and phenotype_score <= 1),
  -- 0.6 mechanism + 0.4 phenotype, stored so the weighting is auditable.
  combined_score  real not null check (combined_score >= 0 and combined_score <= 1),
  shared_pathways text[] not null default '{}',
  shared_phenotypes text[] not null default '{}',
  -- Set when two units share a gene but must stay apart.
  blocked_reason  text,
  primary key (a_id, b_id)
);
create index if not exists atlas_similarity_b_idx on atlas_similarity (b_id);

-- ----------------------------------------------------------------- coverage view
create or replace view atlas_coverage as
select
  (select count(*) from atlas_diseases)                              as diseases,
  (select count(distinct gene) from atlas_diseases)                   as genes,
  (select count(*) from atlas_diseases)                               as mechanism_units,
  (select count(distinct symptom) from atlas_symptoms)                as phenotypes,
  (select count(*) from atlas_edges)                                  as connections,
  (select count(*) from atlas_edges where tier = 'observed')          as observed_edges,
  (select count(*) from atlas_edges where tier = 'reported')          as reported_edges,
  (select count(*) from atlas_edges where tier = 'inferred')          as inferred_edges,
  (select count(*) from atlas_organizations)                          as organizations,
  (select count(*) from atlas_assets)                                 as assets,
  (select count(*) from atlas_trials)                                 as trials,
  (select count(*) from atlas_researchers)                            as researchers,
  (select count(*) from atlas_clusters)                               as clusters,
  (select max(pulled_at) from atlas_sources)                          as last_pulled;

-- Duplicate effort: clusters holding two or more overlapping assets of the same
-- kind, owned by different communities.
create or replace view atlas_duplicate_effort as
select
  d.cluster_id,
  a.kind,
  count(*)                             as asset_count,
  count(distinct a.owner)              as owner_count,
  array_agg(a.name order by a.name)    as asset_names,
  array_agg(distinct a.owner)          as owners
from atlas_assets a
join atlas_diseases d on d.id = a.disease_id
where d.cluster_id is not null
  and a.kind in ('registry', 'natural history study')
group by d.cluster_id, a.kind
having count(distinct a.owner) > 1;

-- ----------------------------------------------------------------- RLS
-- Public reference data: anon may read, only the service role writes.
do $$
declare t text;
begin
  foreach t in array array[
    'atlas_sources', 'atlas_clusters', 'atlas_diseases', 'atlas_synonyms',
    'atlas_symptoms', 'atlas_open_questions', 'atlas_organizations',
    'atlas_disease_organizations', 'atlas_assets', 'atlas_trials',
    'atlas_trial_diseases', 'atlas_contacts', 'atlas_researchers',
    'atlas_researcher_diseases', 'atlas_edges', 'atlas_metrics',
    'atlas_similarity'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_read', t);
    execute format(
      'create policy %I on %I for select to anon, authenticated using (true)',
      t || '_read', t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------- realtime
-- Same access model as 20261003000002_public_read_realtime.sql: clients
-- subscribe and Realtime honours the select policies above. Re-runnable, since
-- adding a table already in the publication raises.
do $$
declare t text;
begin
  foreach t in array array['atlas_diseases', 'atlas_edges', 'atlas_metrics'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- DELETE events need the full old row to identify what went away.
alter table atlas_diseases replica identity full;
alter table atlas_edges    replica identity full;
