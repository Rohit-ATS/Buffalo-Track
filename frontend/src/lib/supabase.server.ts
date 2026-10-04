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

/**
 * Parsed once from .env, and only when process.env is missing a key.
 *
 * Vite's SSR module runner does not always see mutations made to process.env
 * in vite.config.ts, so a server-only secret can be present in .env, visible to
 * loadEnv, and still absent here — which looks exactly like "not configured"
 * and is maddening to debug. Reading the file directly removes the question.
 *
 * Server-only: this module must never reach the browser, and the dynamic
 * require keeps the bundler from trying to follow `node:fs` if it ever did.
 */
let dotenvCache: Record<string, string> | null = null;

function fromDotenv(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;

  if (dotenvCache === null) {
    dotenvCache = {};
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { readFileSync } = require("node:fs") as typeof import("node:fs");
      const raw = readFileSync(".env", "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 1) continue;
        const key = trimmed.slice(0, eq).trim();
        // Strip one layer of matching quotes, which .env files often carry.
        const value = trimmed
          .slice(eq + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, "$2");
        if (value) dotenvCache[key] = value;
      }
    } catch {
      // No .env, or not a filesystem we can read. Platform env is the answer.
    }
  }

  return dotenvCache[name];
}

function readEnv(name: string): string | undefined {
  // `process` is absent on some edge runtimes (e.g. a Cloudflare Worker build),
  // where credentials arrive as platform bindings instead.
  if (typeof process === "undefined") return undefined;

  const value = process.env[name];
  if (value && value.length > 0) return value;

  // A real environment variable always wins; this is only the fallback.
  return fromDotenv(name);
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
