import { createServerFn } from "@tanstack/react-start";

import type { AtlasSearchResult } from "@/lib/atlas";
import { runAtlasSearch } from "@/lib/atlas-graph";
import { getSupabaseAdmin } from "@/lib/supabase.server";

/**
 * The browser calls this over RPC; the handler body is stripped from the client
 * bundle, so the service-role key never ships. See src/lib/supabase.server.ts.
 */
export const searchAtlas = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => ({ query: String(input?.query ?? "") }))
  .handler(({ data }): Promise<AtlasSearchResult> =>
    runAtlasSearch(getSupabaseAdmin(), data.query),
  );
