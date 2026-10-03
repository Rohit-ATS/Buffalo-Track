# Database

Two layers live here:

| Migration                                  | What it adds                                                        |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `20261003000001_init.sql`                  | Generic `nodes` / `edges` / `evidence` store with pgvector            |
| `20261003000002_public_read_realtime.sql`  | Public read + realtime for those three tables                         |
| `20261003000003_atlas.sql`                 | The typed `atlas_*` domain the product queries                        |
| `20261003000004_atlas_realtime.sql`        | Realtime for the atlas tables `/mechanisms` reads live                |
| `20261003000005_atlas_nodes.sql`           | First-class `atlas_genes` / `atlas_pathways` / `atlas_phenotypes` / `atlas_publications` / `atlas_grants`, FK'd from `atlas_diseases` / `atlas_symptoms` |
| `20261003000006_web_discovery.sql`         | Bright Data discovery output: runs, SERP candidates, fetched pages, extracted claims, discovered assets. See backend/DISCOVERY.md |
| `20261003000007_effect_class_hyphenation.sql` | Renames `effect_class` values to match the plan's spelling (`loss-of-function`, not `loss of function`) |
| `20261003000008_disease_entities.sql`      | `atlas_disease_entities` (MONDO), FK'd from `atlas_diseases` — Disease as its own node, separate from Mechanism Unit |
| `20261003000009_loader_columns.sql`        | `atlas_symptoms.frequency`, `atlas_genes.clinvar_summary`/`.dosage_sensitivity` — see backend/LOADERS.md |

| Seed                             | Loads                                                             |
| --------------------------------- | ------------------------------------------------------------------ |
| `seed.sql`                        | A small demo graph into `nodes` / `edges` / `evidence`             |
| `seed_atlas.sql`                  | The curated atlas snapshot into the `atlas_*` tables               |
| `seed_atlas_nodes.sql`            | Genes/pathways/phenotypes derived from the same snapshot, plus the FK backfill — run after `seed_atlas.sql` |
| `seed_atlas_disease_entities.sql` | One disease entity per mechanism unit (1:1 in this dataset — see the migration's header), plus the FK backfill — run after `seed_atlas.sql` |

`seed_atlas.sql` is **generated** — edit `frontend/src/lib/atlas-data.ts` and run
`cd frontend && bun run seed:generate`. `seed_atlas_nodes.sql` is hand-written but
mechanical: every id/name comes straight from that same dataset (see its own header).

## Apply to your Supabase project

```bash
supabase login
supabase link --project-ref <your-ref>
supabase db push                      # applies all three migrations
```

Then load the seeds, in order (`seed_atlas_nodes.sql` and
`seed_atlas_disease_entities.sql` both backfill FKs onto rows `seed_atlas.sql`
creates, so they run after it; order between the two doesn't matter). In the
dashboard SQL Editor, paste each in turn. Or with `psql`:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
psql "$DATABASE_URL" -f supabase/seed_atlas.sql
psql "$DATABASE_URL" -f supabase/seed_atlas_nodes.sql
psql "$DATABASE_URL" -f supabase/seed_atlas_disease_entities.sql
```

Point the frontend at it (`frontend/.env`, see `frontend/.env.example`):

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## Run it locally instead

```bash
npx supabase start                    # applies migrations + seed.sql
npx supabase status                   # prints URL, anon key, service role key
docker exec -i supabase_db_<ref> psql -U postgres -d postgres < supabase/seed_atlas.sql
```

`supabase db reset` loads both seeds automatically — they are registered under
`[db.seed]` in `config.toml`.

## What the atlas schema enforces

- **The node is a mechanism unit: gene × effect class.** `CACNA1A` loss-of-function
  and gain-of-function are two rows in `atlas_diseases`, never one. `atlas_similarity`
  carries a `blocked_reason` for same-gene/different-effect pairs, and the related-unit
  query excludes them — that is the counterexample view.
- **Reported edges must carry a quote.** `atlas_edges_reported_needs_quote` rejects a
  `reported` edge with a null quote. A claim computed by us is `inferred`, not reported.
- **Confidence always travels with its rule.** `confidence` and `rule` are both `not null`.
- **Provenance is not optional.** `source_id` and `retrieved_at` are `not null` on every edge.
- **Similarity keeps its components.** `mechanism_score` and `phenotype_score` are stored
  alongside `combined_score` (0.6 × mechanism + 0.4 × phenotype), so the weighting is auditable.

## Honest gaps

`atlas_metrics` holds only numbers computed from the snapshot: quote coverage,
contradiction coverage, observed share. Three numbers the plan asks for are
**not** populated, because they require the extraction pipeline that does not
exist yet:

- extraction rejection rate (how many model claims failed quote verification)
- manual audit precision (accuracy over 50 hand-labelled edges)
- cluster stability (how often pairs survive reruns across seeds/resolutions)

`quote_verified` is `false` on every seeded edge. The snapshot quotes are
hand-entered and have not been checked verbatim against source text. Do that
before the demo — it is item one on the plan's own final checklist.

`atlas_publications` and `atlas_grants` (20261003000005_atlas_nodes.sql) exist
as tables but are seeded with **zero rows**. The curated dataset only has
database-level sources (`atlas_sources`: ClinVar, PubMed, …), never an
individual paper or grant record — seeding either would mean inventing ones
that don't exist. Same reasoning as the metrics above: an honest gap, not a
placeholder.

The plan's node list also calls for `hgnc_id` / `reactome_id` / `go_id` /
`hpo_id` on genes, pathways, and phenotypes. All four are `null` on every
seeded row, for the same reason `atlas_trials.nct_id` is null until matched to
a real ClinicalTrials.gov entry — these need a real registry lookup, which
this snapshot never did.

`atlas_disease_entities.mondo_id` is the same kind of null. Disease and
Mechanism Unit are split as separate nodes now (20261003000008), but in this
dataset they're 1:1 — the split exists for the case the plan anticipates
(one named disease, more than one mechanism unit) that this snapshot doesn't
happen to contain. `atlas_diseases.mondo_id`/`.name` stay in place alongside
the new FK, so nothing that already reads them changed.
