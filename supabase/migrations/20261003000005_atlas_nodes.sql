-- Fills the gap between the typed atlas_* schema and the plan's full node
-- list. Gene, Pathway/Process, Phenotype, Publication, and Grant were plain
-- text columns (or missing entirely); this makes each a first-class,
-- deduplicated node with its canonical external-ID field.
--
-- Deliberately NOT done here: splitting atlas_diseases into separate
-- Disease (MONDO) and Mechanism Unit (gene x effect) nodes. atlas_diseases
-- already IS the mechanism unit, correctly and by design (see supabase/
-- README.md's "What the atlas schema enforces") -- it's wired into the
-- query layer, the generator, the seed, and ~10 integration test
-- assertions. Restructuring it is a real architectural change that belongs
-- in its own reviewed migration, not folded into this one. mondo_id stays
-- where it already lives, on atlas_diseases.
--
-- Every new table is purely additive: existing columns (atlas_diseases.gene,
-- .pathway; atlas_symptoms.symptom, .hpo_id) are untouched, so nothing that
-- already reads them breaks. The new FK columns are nullable and backfilled
-- by the seed, not required at write time.

-- ----------------------------------------------------------------- genes
create table if not exists atlas_genes (
  id         text primary key,  -- the gene symbol itself, e.g. 'CACNA1A' -- already how every
                                 -- other table refers to a gene, so this is a free join key.
  symbol     text not null,
  name       text,
  -- Null until matched to a real HGNC entry. Never render a placeholder as
  -- a resolved ID -- same rule the project already applies to
  -- atlas_trials.nct_id.
  hgnc_id    text,
  created_at timestamptz not null default now()
);

alter table atlas_diseases add column if not exists gene_id text references atlas_genes (id);
create index if not exists atlas_diseases_gene_id_idx on atlas_diseases (gene_id);

-- ----------------------------------------------------------------- pathways / processes
create table if not exists atlas_pathways (
  id           text primary key,  -- slug, e.g. 'presynaptic-vesicle-release'
  name         text not null,
  reactome_id  text,  -- e.g. 'R-HSA-...'; null until resolved
  go_id        text,  -- e.g. 'GO:...'; null until resolved
  created_at   timestamptz not null default now()
);

alter table atlas_diseases add column if not exists pathway_id text references atlas_pathways (id);
create index if not exists atlas_diseases_pathway_id_idx on atlas_diseases (pathway_id);

-- ----------------------------------------------------------------- phenotypes
-- Normalizes what atlas_symptoms stored as a free string per disease into a
-- shared node, so "epilepsy" on five diseases is one row, not five.
create table if not exists atlas_phenotypes (
  id         text primary key,  -- slug, e.g. 'epilepsy', or the hpo_id once resolved
  name       text not null,
  hpo_id     text,
  created_at timestamptz not null default now()
);

alter table atlas_symptoms add column if not exists phenotype_id text references atlas_phenotypes (id);
create index if not exists atlas_symptoms_phenotype_id_idx on atlas_symptoms (phenotype_id);

-- ----------------------------------------------------------------- publications
-- Distinct from atlas_sources, which is a whole upstream database (PubMed,
-- ClinVar); this is one paper. source_id records which database it was
-- pulled through.
create table if not exists atlas_publications (
  id         text primary key,  -- the PMID when known, else a slug
  pmid       text,
  title      text,
  authors    text,
  journal    text,
  year       integer,
  url        text,
  source_id  text references atlas_sources (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists atlas_disease_publications (
  disease_id     text not null references atlas_diseases (id) on delete cascade,
  publication_id text not null references atlas_publications (id) on delete cascade,
  primary key (disease_id, publication_id)
);

-- ----------------------------------------------------------------- grants
create table if not exists atlas_grants (
  id           text primary key,  -- the NIH RePORTER project number when known, else a slug
  reporter_id  text,
  title        text,
  agency       text,
  pi_name      text,
  amount       numeric,
  start_date   date,
  end_date     date,
  url          text,
  source_id    text references atlas_sources (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists atlas_disease_grants (
  disease_id text not null references atlas_diseases (id) on delete cascade,
  grant_id   text not null references atlas_grants (id) on delete cascade,
  primary key (disease_id, grant_id)
);

-- ----------------------------------------------------------------- RLS
-- Same model as every other atlas table: public read, service-role write.
do $$
declare t text;
begin
  foreach t in array array[
    'atlas_genes', 'atlas_pathways', 'atlas_phenotypes',
    'atlas_publications', 'atlas_disease_publications',
    'atlas_grants', 'atlas_disease_grants'
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

-- Not added to the realtime publication: nothing reads these live yet.
-- Add alongside whatever view first queries them, the same pattern
-- 20261003000004_atlas_realtime.sql followed for /mechanisms.
