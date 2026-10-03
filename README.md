# Buffalo-Track

A graph-backed rare-disease atlas. Two halves:

| Path        | What it is                                                                    |
| ----------- | ----------------------------------------------------------------------------- |
| `supabase/` | Postgres schema: `nodes`, `edges`, `evidence` (with pgvector embeddings)      |
| `frontend/` | TanStack Start app — search-first landing page, research workspace, dashboard |

Searching a gene, mechanism, or disorder on the landing page walks the graph: it
finds the matching node, lists its edges with the number of evidence rows behind
each one, and shows the evidence receipts themselves.

## Quick start

```bash
# 1. Database — see "Database setup" below
# 2. Frontend
cd frontend
bun install          # or: npm install
cp .env.example .env # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
bun run dev          # http://localhost:8080
```

Without `.env`, the app still runs — search reports that the live atlas is not
connected and the curated sample path on the page carries the demo.

## Database setup

1. Create a project at https://supabase.com/dashboard, then copy `.env.example` to `.env` and fill it in
   from **Settings → API** and **Settings → Database**.
2. Apply the schema, either via the dashboard SQL Editor (paste `supabase/migrations/20261003000001_init.sql`)
   or with the CLI:

   ```bash
   supabase login
   supabase link --project-ref <your-ref>
   supabase db push
   ```

3. Load the demo graph so searches return something: paste `supabase/seed.sql` into the SQL Editor.
   Locally, `supabase db reset` loads it automatically (registered under `[db.seed]` in `config.toml`).
4. Verify: run `supabase/verify.sql`. You should see the `vector` and `pgcrypto` extensions,
   all three tables, and `evidence.embedding` typed as `vector(1536)`.
5. Optional smoke test: run `supabase/smoke_test.sql`.

Seeded queries worth trying on the landing page: `STXBP1`, `STX1B`, `CACNA1A`,
`SNAP25`, `Presynaptic vesicle fusion`.

## Schema notes

- `evidence.embedding` is `vector(1536)` — matches OpenAI `text-embedding-3-small`. Change it in the
  migration *before* first run if your model differs (Voyage `voyage-3` is 1024).
- RLS is enabled on all three tables with **no policies**, so the `anon` key reads nothing.
  Server-side access via the service-role key bypasses RLS. Add policies before exposing
  direct client reads.
- Each `evidence` row attaches to a node or an edge (at least one is required).

## How the frontend reads the graph

Because RLS blocks the anon key, the browser never queries Supabase directly.
The lookup runs in a TanStack Start **server function**:

- `frontend/src/lib/supabase.server.ts` — service-role client, server-only, returns
  `null` when credentials are absent.
- `frontend/src/lib/atlas-search.ts` — the server function the browser calls over RPC.
- `frontend/src/lib/atlas-graph.ts` — matches nodes in three passes (exact → prefix →
  substring), then loads edges, neighbours, and evidence counts.
- `frontend/src/components/atlas-results.tsx` — renders the match, its connections,
  and the evidence receipts.

The research views (`/dashboard`, `/disease/$id`, `/compare`, `/mechanisms`,
`/researchers`, `/methods`) read the static sample dataset in
`frontend/src/lib/atlas-data.ts`, not the database. Only the landing-page search
is live.

Keep `SUPABASE_SERVICE_ROLE_KEY` unprefixed: anything named `VITE_*` is bundled
into client JavaScript.

## Frontend commands

Run from `frontend/`:

| Command            | What it does                      |
| ------------------ | --------------------------------- |
| `bun run dev`      | Dev server on port 8080           |
| `bun run build`    | Production build into `.output/`  |
| `bun run test`     | Vitest suite                      |
| `bun run lint`     | ESLint                            |
| `bun run format`   | Prettier write                    |
| `bunx tsc --noEmit`| Typecheck                         |
