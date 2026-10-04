import { getSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * Logs a click on a button/link that navigates to /dashboard
 * (atlas_dashboard_clicks, 20261003000016_dashboard_clicks.sql). Fire-and-
 * forget: never blocks or breaks navigation. Silently does nothing if
 * Supabase isn't configured or the insert fails — a missed analytics event
 * is not worth interrupting someone trying to reach the dashboard.
 *
 * `source` should be a short, stable label identifying which button this is
 * (e.g. "landing_cta", "nav_devon") so events are distinguishable per site.
 */
export function trackDashboardClick(source: string, search?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const db = getSupabaseBrowser();
  if (!db) return;

  try {
    void db
      .from("atlas_dashboard_clicks")
      .insert({
        source,
        from_path: window.location?.pathname ?? "/",
        search: search ? new URLSearchParams(search as Record<string, string>).toString() : null,
      })
      // Two-argument .then, not .then().catch(): the builder resolves to a
      // PromiseLike, which has no .catch. Same intent -- swallow a rejected
      // insert so telemetry can never surface an error to someone navigating.
      .then(
        ({ error }) => {
          if (error) console.warn("trackDashboardClick failed:", error.message);
        },
        () => {},
      );
  } catch {
    // Non-blocking telemetry
  }
}
