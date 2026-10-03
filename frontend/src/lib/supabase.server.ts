import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client.
 *
 * RLS is enabled on `nodes`, `edges`, and `evidence` (see supabase/migrations)
 * with public SELECT policies and no write policies, so the anon key can read
 * but not write. This client uses the service-role key instead, which
 * bypasses RLS entirely — hence server-only. This module must never be
 * imported from a component that ships to the browser. For client-side reads
 * (e.g. live graph updates), use src/lib/supabase-browser.ts, which uses the
 * anon key and is safe to ship.
 */

let cached: SupabaseClient | null | undefined;

function readEnv(name: string): string | undefined {
  // `process` is absent on some edge runtimes (e.g. a Cloudflare Worker build),
  // where credentials arrive as platform bindings instead.
  if (typeof process === "undefined") return undefined;
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/** Returns null when the project has no Supabase credentials configured. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = readEnv("SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    cached = null;
    return cached;
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseAdmin() !== null;
}
