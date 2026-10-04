# Render deployment checklist

1. Apply the Supabase migrations and load the seed data before deploying the API.
2. In the Render Blueprint, set `SUPABASE_URL` to the **Data API** URL,
   `SUPABASE_SERVICE_ROLE_KEY`, and the exact Pages origin in `CORS_ORIGINS`:
   `https://rohit-ats.github.io`. `BACKEND_PROXY_SECRET` is still required
   when Supabase is configured, even though the static Pages frontend does not
   use it.
3. The Pages workflow builds with
   `VITE_BACKEND_URL=https://buffalo-track-api.onrender.com`. Do not put the
   service-role key or `BACKEND_PROXY_SECRET` in any `VITE_*` variable.
4. Deploy, then check `GET /healthz` returns `200` and `GET /readyz` returns
   `200`. `readyz` verifies the configured Supabase credentials.
5. Open `https://rohit-ats.github.io/Buffalo-Track/` and search `STXBP1`.
   Verify a result is shown;
   rate-limited searches return `429` from the API with `Retry-After`.

The GitHub Pages build calls the Render API directly from the browser. This is
intentional: Pages is static and cannot execute TanStack server functions. The
backend keeps the Supabase service-role key private and enforces the IP-based
search limit itself.

The Render blueprint intentionally runs one API instance. Move rate-limit state
to shared storage before increasing `numInstances`.
