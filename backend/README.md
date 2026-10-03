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

## External-data loaders and discovery

[LOADERS.md](LOADERS.md) resolves/enriches the curated genes and mechanism
units against official sources (Monarch, HPO, ClinVar, ClinGen, Gene2Phenotype,
Reactome/GO, ClinicalTrials.gov, NIH RePORTER, Europe PMC). [DISCOVERY.md](DISCOVERY.md)
covers what those don't: patient organizations and the research
infrastructure they've built, via Bright Data web search and extraction.

## Render

The root `render.yaml` defines the service. Create a Render Blueprint from this
repository and enter `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, the final
frontend URL in `CORS_ORIGINS`, and a random `BACKEND_PROXY_SECRET` (at least
32 characters). Set the identical `BACKEND_PROXY_SECRET`, without a `VITE_`
prefix, in the frontend server environment. It signs the browser's rate-limit
identity without exposing a secret to the browser. Render injects `PORT`
automatically. The blueprint fixes the API at one instance; use a shared rate
limiter before scaling it out.

Follow the complete [Render deployment checklist](RENDER_DEPLOY.md).
