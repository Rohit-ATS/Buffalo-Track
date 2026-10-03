# Buffalo-Track

A graph-backed rare-disease atlas. Two halves:

| Path        | What it is                                                                    |
| ----------- | ----------------------------------------------------------------------------- |
| `supabase/` | Postgres schema: `nodes`, `edges`, `evidence` (with pgvector embeddings)      |
| `frontend/` | TanStack Start app — search-first landing page, research workspace, dashboard |
| `backend/` | FastAPI graph-search service, ready for deployment to Render |

Searching a gene, mechanism, or disorder on the landing page walks the graph: it
finds the matching node, lists its edges with the number of evidence rows behind
each one, and shows the evidence receipts themselves.

## Quick start

```bash
# 1. Database — see "Database setup" below
# 2. Frontend
cd frontend
bun install          # or: npm install
cp .env.example .env # set BACKEND_URL after starting the API below
bun run dev          # http://localhost:8080
```

## Backend API

The production search API lives in [`backend/`](backend/README.md). It exposes
`POST /api/v1/search`, `/healthz`, and `/readyz`; `render.yaml` deploys it as a
Render web service. Copy `backend/.env.example` to `backend/.env` locally, then
set `BACKEND_URL` in `frontend/.env` to connect the frontend. The service-role
key stays in the backend environment and must never use a `VITE_` prefix.

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
The lookup runs through the FastAPI backend; the TanStack Start **server function**
forwards the browser request to it:

- `backend/app/atlas.py` — matches nodes in three passes (exact → prefix →
  substring), then loads edges, neighbours, and evidence counts with the
  server-only service-role key.
- `frontend/src/lib/atlas-search.ts` — the server function the browser calls over RPC;
  it forwards the request to `BACKEND_URL`.
- `frontend/src/components/atlas-results.tsx` — renders the match, its connections,
  and the evidence receipts.

The research views (`/dashboard`, `/disease/$id`, `/compare`, `/mechanisms`,
`/researchers`, `/methods`) read the static sample dataset in
`frontend/src/lib/atlas-data.ts`, not the database. Only the landing-page search
is live.

Set `SUPABASE_SERVICE_ROLE_KEY` only in `backend/.env` or Render. It must never
be prefixed with `VITE_`, which would bundle it into client JavaScript.

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

## Access model (hackathon)

No authentication. The graph is **publicly readable**; writes go through the
backend using the service-role key.

- `anon` key → `SELECT` on `nodes`, `edges`, `evidence`. Nothing else.
- `service_role` key → full access (bypasses RLS). Server-side only — never
  ship it to the browser.
- Realtime is enabled on all three tables, and honours the read policies.

⚠️ The anon key is visible to anyone who opens your site, so treat everything
in these tables as public. Fine for demo data; don't load anything sensitive.

### Subscribing to live updates

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// initial load
const { data: nodes } = await supabase.from('nodes').select('*')
const { data: edges } = await supabase.from('edges').select('*')

// live patches
supabase
  .channel('graph')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'nodes' }, applyNodeChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'edges' }, applyEdgeChange)
  .subscribe()
```

`payload.eventType` is `INSERT` / `UPDATE` / `DELETE`; `payload.new` holds the
row (and `payload.old` the previous one, for `nodes` and `edges`).
