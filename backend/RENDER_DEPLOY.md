# Render deployment checklist

1. Apply the Supabase migrations and load the seed data before deploying the API.
2. In the Render Blueprint, set `SUPABASE_URL` to the **Data API** URL,
   `SUPABASE_SERVICE_ROLE_KEY`, the final frontend URL in `CORS_ORIGINS`, and
   `BACKEND_PROXY_SECRET` from `openssl rand -hex 32`.
3. Set the same `BACKEND_PROXY_SECRET` and `BACKEND_URL` (the Render API URL)
   in the frontend's **server** environment. Neither value has a `VITE_` prefix.
4. Deploy, then check `GET /healthz` returns `200` and `GET /readyz` returns
   `200`. `readyz` verifies the configured Supabase credentials.
5. Open the deployed frontend and search `STXBP1`. Verify a result is shown;
   rate-limited searches return `429` from the API with `Retry-After`.

The Render blueprint intentionally runs one API instance. Move rate-limit state
to shared storage before increasing `numInstances`.
