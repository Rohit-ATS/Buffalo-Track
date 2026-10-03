import { createServerFn } from "@tanstack/react-start";

import type { AtlasSearchResult } from "@/lib/atlas";

function getBackendUrl(): string | undefined {
  if (typeof process === "undefined") return undefined;
  const value = process.env["BACKEND_URL"];
  return value ? value.replace(/\/$/, "") : undefined;
}

async function searchBackend(query: string): Promise<AtlasSearchResult | null> {
  const backendUrl = getBackendUrl();
  if (!backendUrl) return null;

  try {
    const response = await fetch(`${backendUrl}/api/v1/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    return (await response.json()) as AtlasSearchResult;
  } catch (error) {
    console.error("backend atlas search failed", error);
    return { status: "error", query, message: "The atlas API is temporarily unavailable." };
  }
}

/**
 * The browser calls this over RPC; the handler body is stripped from the client
 * bundle and forwards requests to the FastAPI service. The service-role key
 * exists only in that service's environment.
 */
export const searchAtlas = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => ({ query: String(input?.query ?? "") }))
  .handler(async ({ data }): Promise<AtlasSearchResult> => {
    const backendResult = await searchBackend(data.query);
    return backendResult ?? { status: "unconfigured", query: data.query };
  });
