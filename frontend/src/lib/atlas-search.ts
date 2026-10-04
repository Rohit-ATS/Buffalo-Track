import type { AtlasSearchResult } from "@/lib/atlas";
import { searchAtlas as searchCuratedAtlas } from "@/lib/atlas-data";

function getBackendUrl(): string | undefined {
  const value = import.meta.env["VITE_BACKEND_URL"];
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
    if (response.status === 429) {
      return {
        status: "error",
        query,
        message: "The atlas is handling many searches. Please try again shortly.",
      };
    }
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    const result = (await response.json()) as AtlasSearchResult;
    return result.status === "error" ? null : result;
  } catch (error) {
    console.error("backend atlas search failed", error);
    return null;
  }
}

/**
 * GitHub Pages is static, so the browser calls the public, rate-limited API
 * directly. The Supabase service-role key remains exclusively on the backend.
 */
export async function searchAtlas({
  data,
}: {
  data: { query: string };
}): Promise<AtlasSearchResult> {
  const query = String(data?.query ?? "");
  const backendResult = await searchBackend(query);
  if (backendResult) return backendResult;
  return {
    status: "fallback",
    query,
    message: "Live atlas is temporarily unavailable. Showing the bundled curated atlas instead.",
    matches: searchCuratedAtlas(query),
  };
}
