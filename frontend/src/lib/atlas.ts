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

export type AtlasSearchResult =
  /** No backend URL is configured. */
  | { status: "unconfigured"; query: string }
  /** The live API is unavailable — use the bundled curated atlas. */
  | {
      status: "fallback";
      query: string;
      message: string;
      matches: Array<{ label: string; type: string; diseaseId: string; alias?: string }>;
    }
  /** Database reachable, nothing matched the query. */
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
