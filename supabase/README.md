# Database

Two layers live here:

| Migration                              | What it adds                                                        |
| -------------------------------------- | ------------------------------------------------------------------- |
| `20261003000001_init.sql`              | Generic `nodes` / `edges` / `evidence` store with pgvector           |
| `20261003000002_public_read_realtime.sql` | Public read + realtime for those three tables                     |
| `20261003000003_atlas.sql`             | The typed `atlas_*` domain the product queries                      |

| Seed              | Loads                                                     |
| ----------------- | --------------------------------------------------------- |
| `seed.sql`        | A small demo graph into `nodes` / `edges` / `evidence`     |
| `seed_atlas.sql`  | The curated atlas snapshot into the `atlas_*` tables       |

`seed_atlas.sql` is **generated** — edit `frontend/src/lib/atlas-data.ts` and run
`cd frontend && bun run seed:generate`.

## Apply to your Supabase project

```bash
supabase login
supabase link --project-ref <your-ref>
supabase db push                      # applies all three migrations
```

Then load the seeds. In the dashboard SQL Editor, paste `seed.sql` and
`seed_atlas.sql` in that order. Or with `psql`:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
psql "$DATABASE_URL" -f supabase/seed_atlas.sql
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
