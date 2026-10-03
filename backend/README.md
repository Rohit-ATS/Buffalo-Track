# Buffalo Track backend

FastAPI service for the live graph search. It reads the existing `nodes`,
`edges`, and `evidence` tables in Supabase with the service-role key, which is
kept only on the server.

## Local run

```bash
cd backend
uv venv
uv pip install -r requirements-dev.txt
cp .env.example .env
uv run uvicorn app.main:app --reload --port 8000
```

The API is then available at `http://localhost:8000/docs`.

| Endpoint | Purpose |
| --- | --- |
| `GET /healthz` | Process health, used by Render |
| `GET /readyz` | Confirms that Supabase is reachable with the configured credentials |
| `POST /api/v1/search` | Graph lookup, body: `{ "query": "STXBP1" }` |

Run the tests with `uv run pytest`.

## Render

The root `render.yaml` defines the service. Create a Render Blueprint from this
repository and enter `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the final
frontend URL in `CORS_ORIGINS`. Render injects `PORT` automatically.
