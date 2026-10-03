import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client, built from the anon key. Safe to ship to the
 * client bundle: RLS (see supabase/migrations/20261003000002_public_read_realtime.sql)
 * restricts it to read-only access on nodes, edges, and evidence. Never use
 * the service-role key here — see src/lib/supabase.server.ts for that one.
 *
 * Vite only exposes VITE_*-prefixed vars to client code, so these are
 * separate from SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in supabase.server.ts.
 */

let cached: SupabaseClient | null = null;

/** Null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY aren't set — callers should fall back gracefully. */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached) return cached;

  const url = import.meta.env["VITE_SUPABASE_URL"];
  const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];
  if (!url || !anonKey) return null;

  cached = createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return cached;
}
