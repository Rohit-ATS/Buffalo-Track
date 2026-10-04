import type { AtlasSearchResult } from "@/lib/atlas";
import { searchAtlas as searchCuratedAtlas } from "@/lib/atlas-data";

function getBackendUrl(): string | undefined {
  const value = import.meta.env["VITE_BACKEND_URL"];
  return value ? value.replace(/\/$/, "") : undefined;
}

type BackendOutcome =
  /** No VITE_BACKEND_URL for this build — not a failure, just unconfigured. */
  | { kind: "unconfigured" }
  /** The request itself failed: network, timeout, non-2xx, bad JSON. */
  | { kind: "unreachable"; detail: string }
  /** The backend answered, but its own search attempt failed server-side
   *  (e.g. a malformed query against Supabase). This is the state the old
   *  code silently discarded by converting it to `null`, indistinguishable
   *  from "didn't ask yet." */
  | { kind: "backend-error"; detail: string }
  | { kind: "rate-limited"; detail: string }
  | { kind: "answered"; result: AtlasSearchResult & { status: "ok" | "empty" } };

async function askBackend(query: string): Promise<BackendOutcome> {
  const backendUrl = getBackendUrl();
  if (!backendUrl) return { kind: "unconfigured" };

  let response: Response;
  try {
    response = await fetch(`${backendUrl}/api/v1/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    console.error("live atlas search request failed", error);
    return { kind: "unreachable", detail: "The live atlas could not be reached." };
  }

  if (response.status === 429) {
    return {
      kind: "rate-limited",
      detail: "The atlas is handling many searches right now. Please try again shortly.",
    };
  }
  if (!response.ok) {
    return {
      kind: "unreachable",
      detail: `The live atlas returned an unexpected error (${response.status}).`,
    };
  }

  let body: AtlasSearchResult;
  try {
    body = (await response.json()) as AtlasSearchResult;
  } catch (error) {
    console.error("live atlas search response could not be parsed", error);
    return { kind: "unreachable", detail: "The live atlas sent back something unreadable." };
  }

  if (body.status === "error") {
    // The backend reached Supabase and the search itself failed there (see
    // backend/app/atlas.py AtlasRepository.search). This is a real outage,
    // not an empty result — it must never read as "nothing found."
    return { kind: "backend-error", detail: body.message };
  }
  if (body.status === "ok" || body.status === "empty") {
    return { kind: "answered", result: body };
  }
  // "unconfigured" / "fallback" from the backend itself would be unexpected
  // for this endpoint; treat defensively as unreachable rather than guessing.
  return { kind: "unreachable", detail: "The live atlas returned an unrecognized response." };
}

/**
 * GitHub Pages is static, so the browser calls the public, rate-limited API
 * directly. The Supabase service-role key remains exclusively on the backend.
 *
 * Every branch below is honest about which of three things happened: the
 * live atlas answered, the live atlas is down right now, or there was never a
 * live atlas to ask in this build. See frontend/src/components/DataStateBadge.tsx
 * for where that distinction surfaces to a person deciding whether to trust
 * what's on screen.
 */
export async function searchAtlas({
  data,
}: {
  data: { query: string };
}): Promise<AtlasSearchResult> {
  const query = String(data?.query ?? "");
  const outcome = await askBackend(query);
  const curatedMatches = searchCuratedAtlas(query);

  switch (outcome.kind) {
    case "answered": {
      const { result } = outcome;
      if (result.status === "ok") return result;
      // Live, verified, genuinely nothing — offer the curated snapshot as an
      // opt-in supplement, but say plainly that live already answered.
      if (curatedMatches.length === 0) return { status: "empty", query };
      return {
        status: "fallback",
        reason: "no-live-match",
        query,
        message:
          "The live atlas checked and found nothing for this exact term. These are related entries from the curated snapshot instead.",
        matches: curatedMatches,
      };
    }
    case "unconfigured":
      return { status: "unconfigured", query, matches: curatedMatches };
    case "rate-limited":
      return { status: "error", query, message: outcome.detail };
    case "unreachable":
    case "backend-error":
      return {
        status: "fallback",
        reason: "unavailable",
        query,
        message: outcome.detail,
        matches: curatedMatches,
      };
  }
}
