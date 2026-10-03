-- Web discovery: the Bright Data layer's output.
--
-- Structured biomedical facts come from official APIs and bulk files. This
-- layer covers what those miss -- patient organizations, registries, natural
-- history programmes, labs and the reusable assets they own -- by discovering
-- pages with the SERP API, fetching them with Web Unlocker / Crawl, extracting
-- claims with a model, and rejecting anything whose quote cannot be found
-- verbatim in the fetched text.
--
-- Nothing here is `observed`. A scraped page is `reported` evidence at best,
-- and only once its quote verifies.

-- ----------------------------------------------------------------- enums
do $$ begin
  create type web_fetch_method as enum ('serp', 'unlocker', 'crawl', 'scraper', 'browser');
exception when duplicate_object then null; end $$;

do $$ begin
  -- What the domain classifier decided a candidate URL is.
  create type web_source_kind as enum (
    'patient organization',
    'research institution',
    'lab',
    'registry',
    'trial record',
    'publication',
    'government',
    'reference',
    'social',
    'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type extraction_status as enum ('pending', 'verified', 'rejected', 'failed');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------- discovery runs
-- One row per Asset Scout invocation, so every claim traces to a run.
create table if not exists atlas_discovery_runs (
  id            uuid primary key default gen_random_uuid(),
  seed_term     text not null,                 -- the gene or disease searched
  disease_id    text references atlas_diseases (id) on delete set null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  queries_run   integer not null default 0,
  urls_found    integer not null default 0,
  pages_fetched integer not null default 0,
  claims_extracted integer not null default 0,
  claims_verified  integer not null default 0,
  claims_rejected  integer not null default 0,
  dry_run       boolean not null default false,
  notes         text
);

create index if not exists atlas_discovery_runs_seed_idx on atlas_discovery_runs (seed_term);

-- ----------------------------------------------------------------- SERP results
-- Candidate URLs before anything is fetched. Discovery, not evidence.
create table if not exists atlas_serp_results (
  id          bigserial primary key,
  run_id      uuid not null references atlas_discovery_runs (id) on delete cascade,
  query       text not null,
  url         text not null,
  domain      text not null,
  title       text,
  snippet     text,
  rank        integer,
  kind        web_source_kind not null default 'unknown',
  -- False when the classifier rejected it (blog, social, aggregator).
  accepted    boolean not null default false,
  reason      text,
  retrieved_at timestamptz not null default now(),
  unique (run_id, query, url)
);

create index if not exists atlas_serp_results_run_idx on atlas_serp_results (run_id);
create index if not exists atlas_serp_results_domain_idx on atlas_serp_results (domain);

-- ----------------------------------------------------------------- fetched pages
-- The raw material a claim must be traceable to. `content` is kept so the quote
-- verifier can be re-run later without re-fetching.
create table if not exists atlas_web_sources (
  id           uuid primary key default gen_random_uuid(),
  url          text not null unique,
  domain       text not null,
  title        text,
  kind         web_source_kind not null default 'unknown',
  method       web_fetch_method not null,
  content      text,                           -- markdown as fetched
  content_hash text not null,                  -- sha256, for change detection
  content_chars integer not null default 0,
  http_status  integer,
  retrieved_at timestamptz not null default now(),
  run_id       uuid references atlas_discovery_runs (id) on delete set null
);

create index if not exists atlas_web_sources_domain_idx on atlas_web_sources (domain);
create index if not exists atlas_web_sources_retrieved_idx on atlas_web_sources (retrieved_at desc);

-- ----------------------------------------------------------------- extracted claims
-- A model's structured reading of one page. `status` is the verifier's verdict:
-- a claim only becomes evidence once its quote is found verbatim in `content`.
create table if not exists atlas_web_claims (
  id             uuid primary key default gen_random_uuid(),
  source_id      uuid not null references atlas_web_sources (id) on delete cascade,
  run_id         uuid references atlas_discovery_runs (id) on delete set null,
  subject_type   text not null,                -- organization | researcher | asset | disease
  subject_name   text not null,
  predicate      text not null,                -- operates | maintains | funds | studies | contact_for
  object_type    text not null,
  object_name    text not null,
  disease_id     text references atlas_diseases (id) on delete set null,
  gene           text,
  quote          text not null,                -- must appear verbatim in the source
  status         extraction_status not null default 'pending',
  reject_reason  text,
  confidence     real check (confidence is null or (confidence >= 0 and confidence <= 1)),
  rule           text,                         -- why confidence is that number
  model          text,                         -- model + prompt version
  created_at     timestamptz not null default now(),
  -- A verified claim must carry its score and the rule behind it.
  constraint atlas_web_claims_verified_needs_rule
    check (status <> 'verified' or (confidence is not null and rule is not null))
);

create index if not exists atlas_web_claims_source_idx on atlas_web_claims (source_id);
create index if not exists atlas_web_claims_status_idx on atlas_web_claims (status);
create index if not exists atlas_web_claims_disease_idx on atlas_web_claims (disease_id);

-- ----------------------------------------------------------------- discovered assets
-- Verified claims promoted into reusable research infrastructure, linked back
-- to the page that proves them. Separate from atlas_assets (curated snapshot)
-- so the provenance of each stays unambiguous.
create table if not exists atlas_discovered_assets (
  id            uuid primary key default gen_random_uuid(),
  claim_id      uuid not null references atlas_web_claims (id) on delete cascade,
  source_id     uuid not null references atlas_web_sources (id) on delete cascade,
  disease_id    text references atlas_diseases (id) on delete set null,
  kind          asset_kind not null,
  name          text not null,
  owner         text not null,
  url           text,
  eligibility   text,
  investigator  text,
  contact_url   text,
  participants  integer,
  -- Why it might transfer to a neighbouring unit.
  reusable_because text,
  created_at    timestamptz not null default now(),
  unique (source_id, kind, name)
);

create index if not exists atlas_discovered_assets_disease_idx on atlas_discovered_assets (disease_id);
create index if not exists atlas_discovered_assets_kind_idx on atlas_discovered_assets (kind);

-- ----------------------------------------------------------------- freshness view
-- Drives the "Updated N hours ago" badges.
create or replace view atlas_web_freshness as
select
  s.kind,
  count(*)                                  as pages,
  max(s.retrieved_at)                       as newest,
  min(s.retrieved_at)                       as oldest,
  count(*) filter (where s.retrieved_at > now() - interval '24 hours') as fresh_24h
from atlas_web_sources s
group by s.kind;

-- Per-run extraction quality: the rejection rate the methods page asks for.
create or replace view atlas_extraction_quality as
select
  count(*)                                              as claims_total,
  count(*) filter (where status = 'verified')            as verified,
  count(*) filter (where status = 'rejected')            as rejected,
  count(*) filter (where status = 'failed')              as failed,
  case when count(*) = 0 then null
       else round(
         count(*) filter (where status = 'rejected')::numeric / count(*), 4)
  end                                                    as rejection_rate
from atlas_web_claims;

-- ----------------------------------------------------------------- RLS
-- Same model as the rest of the atlas: anon reads, service role writes.
-- `content` is included: it is the page text a judge clicks through to verify.
do $$
declare t text;
begin
  foreach t in array array[
    'atlas_discovery_runs', 'atlas_serp_results', 'atlas_web_sources',
    'atlas_web_claims', 'atlas_discovered_assets'
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

-- Realtime, so the site shows discoveries as the pipeline lands them.
do $$
declare t text;
begin
  foreach t in array array[
    'atlas_discovery_runs', 'atlas_web_sources', 'atlas_discovered_assets'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

alter table atlas_discovery_runs    replica identity full;
alter table atlas_discovered_assets replica identity full;
