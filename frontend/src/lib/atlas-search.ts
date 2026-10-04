import type { AtlasSearchResult } from "@/lib/atlas";

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
    return (await response.json()) as AtlasSearchResult;
  } catch (error) {
    console.error("backend atlas search failed", error);
    return { status: "error", query, message: "The atlas API is temporarily unavailable." };
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
  return backendResult ?? { status: "unconfigured", query };
}
