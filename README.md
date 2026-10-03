# Buffalo-Track

Graph-backed tracking store: `nodes`, `edges`, and `evidence` (with pgvector embeddings) on Supabase Postgres.

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

3. Verify: run `supabase/verify.sql`. You should see the `vector` and `pgcrypto` extensions,
   all three tables, and `evidence.embedding` typed as `vector(1536)`.
4. Optional smoke test: run `supabase/smoke_test.sql`.

## Schema notes

- `evidence.embedding` is `vector(1536)` — matches OpenAI `text-embedding-3-small`. Change it in the
  migration *before* first run if your model differs (Voyage `voyage-3` is 1024).
- RLS is enabled on all three tables with **no policies**, so the `anon` key reads nothing.
  Server-side access via the service-role key bypasses RLS. Add policies before exposing
  direct client reads.
- Each `evidence` row attaches to a node or an edge (at least one is required).
