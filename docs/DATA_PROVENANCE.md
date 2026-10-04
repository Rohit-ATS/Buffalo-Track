# Data provenance and reproducibility

Buffalo-Track separates a curated demonstration dataset from optional live
services. It is a research-navigation tool, not a diagnostic or treatment
system.

## Curated public experience

The public research routes use the versioned sample dataset in
`frontend/src/lib/atlas-data.ts`. The following seed files represent that
dataset in Supabase:

| File                                       | Purpose                                         |
| ------------------------------------------ | ----------------------------------------------- |
| `supabase/seed.sql`                        | Small generic graph used for local smoke checks |
| `supabase/seed_atlas.sql`                  | Generated curated atlas snapshot                |
| `supabase/seed_atlas_nodes.sql`            | Mechanical node and foreign-key backfill        |
| `supabase/seed_atlas_disease_entities.sql` | Disease entities and foreign-key backfill       |

`seed_atlas.sql` is generated from `frontend/src/lib/atlas-data.ts`. Regenerate
it with `cd frontend && bun run seed:generate`, then review the diff before
committing it.

## Live services and permissions

The FastAPI service performs public graph lookup for nodes and edges. Generic
evidence is restricted by Supabase RLS to evidence reviewers and is not
returned by the public search API. Family-space records are private and depend
on Supabase Auth plus row-level security.

Discovery and enrichment tools under `backend/app/` are operator-run commands.
They record source links and retrieved content in Supabase; they are not exposed
as a public URL-fetching API.

## Reproduce a local data check

1. Start a disposable local Supabase instance with `supabase start`.
2. Run `supabase db reset` to apply migrations and the seed files listed in
   `supabase/config.toml`.
3. Run `supabase/verify.sql`, then optionally `supabase/smoke_test.sql`.
4. Run `python -m pytest backend/tests` and, from `frontend/`, run
   `bun run test`, `bunx tsc --noEmit`, and `bun run build`.

For a hosted project, apply migrations with `supabase db push` before loading
or querying seed data. Never use a production project for destructive reset
commands.

## Limits of the current data

- The research routes deliberately use a curated snapshot; they do not claim
  to be complete or current clinical guidance.
- Some entity identifiers, publications, grants, and quantitative metrics are
  intentionally absent until verified source data is available.
- Extracted or discovered material needs review before being presented as a
  clinical claim.
- The Git commit or release tag containing a seed file is its reproducibility
  reference. Record that revision whenever exporting a demo or analysis.

See [`supabase/README.md`](../supabase/README.md) for schema-level limitations
and [`backend/DISCOVERY.md`](../backend/DISCOVERY.md) for the discovery pipeline.
