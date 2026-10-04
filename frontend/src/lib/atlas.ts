/** Shared shapes for atlas search. Safe to import from client components. */

export type AtlasNodeRef = {
  id: string;
  type: string;
  name: string;
};

export type AtlasEvidence = {
  id: string;
  content: string;
  sourceUrl: string | null;
  confidence: number | null;
};

export type AtlasConnection = {
  edgeId: string;
  type: string;
  weight: number;
  direction: "outgoing" | "incoming";
  neighbor: AtlasNodeRef;
  evidenceCount: number;
};

export type AtlasMatch = {
  node: AtlasNodeRef;
  connections: AtlasConnection[];
  evidence: AtlasEvidence[];
};

export type AtlasMatchSummary = { label: string; type: string; diseaseId: string; alias?: string };

export type AtlasSearchResult =
  /** No backend URL is configured for this build. Curated matches, if any,
   *  are shown as a curated snapshot — never worded as a live outage. */
  | { status: "unconfigured"; query: string; matches: AtlasMatchSummary[] }
  /**
   * The live API could not answer this query. `reason` says why, because the
   * two causes read very differently to a family relying on this: the live
   * atlas genuinely broke ("unavailable", with the real backend message), or
   * it answered honestly and just has nothing ("no-live-match", where any
   * matches below are an opt-in curated supplement, not evidence the live
   * atlas failed).
   */
  | {
      status: "fallback";
      query: string;
      reason: "unavailable" | "no-live-match";
      message: string;
      matches: AtlasMatchSummary[];
    }
  /** Database reachable, verified, nothing matched the query — no curated
   *  match existed to offer alongside it. */
  | { status: "empty"; query: string }
  | { status: "error"; query: string; message: string }
  | { status: "ok"; query: string; match: AtlasMatch; alsoMatched: AtlasNodeRef[] | null };

/** Strip characters that carry meaning inside a PostgREST filter expression. */
export function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[,()"'\\*%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
