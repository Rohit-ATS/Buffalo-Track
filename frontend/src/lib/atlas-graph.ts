import type { SupabaseClient } from "@supabase/supabase-js";

import {
  sanitizeQuery,
  type AtlasConnection,
  type AtlasEvidence,
  type AtlasNodeRef,
  type AtlasSearchResult,
} from "@/lib/atlas";

/**
 * Graph traversal for atlas search. Pure in the sense that it takes its client
 * as an argument — no env reads, no server-function wrapper — so it can be
 * tested against a fake client.
 */

type NodeRow = { id: string; type: string; name: string };
type EdgeRow = {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight: number;
};

const NODE_COLUMNS = "id, type, name";
const MAX_MATCHES = 6;
const MAX_CONNECTIONS = 12;
const MAX_EVIDENCE = 3;

/** Three passes, most specific first, so an exact gene symbol outranks a substring hit. */
async function findNodes(db: SupabaseClient, term: string): Promise<NodeRow[]> {
  for (const pattern of [term, `${term}%`, `%${term}%`]) {
    const { data, error } = await db
      .from("nodes")
      .select(NODE_COLUMNS)
      .or(`name.ilike.${pattern},type.ilike.${pattern}`)
      .limit(MAX_MATCHES);

    if (error) throw new Error(error.message);
    if (data && data.length > 0) return data as NodeRow[];
  }

  return [];
}

async function loadConnections(db: SupabaseClient, nodeId: string): Promise<AtlasConnection[]> {
  const { data: edges, error } = await db
    .from("edges")
    .select("id, source_id, target_id, type, weight")
    .or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`)
    .order("weight", { ascending: false })
    .limit(MAX_CONNECTIONS);

  if (error) throw new Error(error.message);
  const edgeRows = (edges ?? []) as EdgeRow[];
  if (edgeRows.length === 0) return [];

  const neighborIds = [
    ...new Set(edgeRows.map((e) => (e.source_id === nodeId ? e.target_id : e.source_id))),
  ];

  const [neighborResult, evidenceResult] = await Promise.all([
    db.from("nodes").select(NODE_COLUMNS).in("id", neighborIds),
    db
      .from("evidence")
      .select("edge_id")
      .in(
        "edge_id",
        edgeRows.map((e) => e.id),
      ),
  ]);

  if (neighborResult.error) throw new Error(neighborResult.error.message);
  if (evidenceResult.error) throw new Error(evidenceResult.error.message);

  const neighbors = new Map<string, AtlasNodeRef>(
    ((neighborResult.data ?? []) as NodeRow[]).map((n) => [
      n.id,
      { id: n.id, type: n.type, name: n.name },
    ]),
  );

  const evidenceCounts = new Map<string, number>();
  for (const row of (evidenceResult.data ?? []) as { edge_id: string | null }[]) {
    if (!row.edge_id) continue;
    evidenceCounts.set(row.edge_id, (evidenceCounts.get(row.edge_id) ?? 0) + 1);
  }

  const connections: AtlasConnection[] = [];
  for (const edge of edgeRows) {
    const outgoing = edge.source_id === nodeId;
    const neighbor = neighbors.get(outgoing ? edge.target_id : edge.source_id);
    if (!neighbor) continue;

    connections.push({
      edgeId: edge.id,
      type: edge.type,
      weight: edge.weight,
      direction: outgoing ? "outgoing" : "incoming",
      neighbor,
      evidenceCount: evidenceCounts.get(edge.id) ?? 0,
    });
  }

  return connections;
}

async function loadEvidence(db: SupabaseClient, nodeId: string): Promise<AtlasEvidence[]> {
  // `embedding` is a 1536-dim vector — never select it for display.
  const { data, error } = await db
    .from("evidence")
    .select("id, content, source_url, confidence")
    .eq("node_id", nodeId)
    .order("confidence", { ascending: false, nullsFirst: false })
    .limit(MAX_EVIDENCE);

  if (error) throw new Error(error.message);

  return (
    (data ?? []) as {
      id: string;
      content: string;
      source_url: string | null;
      confidence: number | null;
    }[]
  ).map((row) => ({
    id: row.id,
    content: row.content,
    sourceUrl: row.source_url,
    confidence: row.confidence,
  }));
}

export async function runAtlasSearch(
  db: SupabaseClient | null,
  rawQuery: string,
): Promise<AtlasSearchResult> {
  const term = sanitizeQuery(rawQuery);
  if (!term) return { status: "empty", query: rawQuery };
  if (!db) return { status: "unconfigured", query: term };

  try {
    const nodes = await findNodes(db, term);
    const [best, ...rest] = nodes;
    if (!best) return { status: "empty", query: term };

    const [connections, evidence] = await Promise.all([
      loadConnections(db, best.id),
      loadEvidence(db, best.id),
    ]);

    return {
      status: "ok",
      query: term,
      match: {
        node: { id: best.id, type: best.type, name: best.name },
        connections,
        evidence,
      },
      alsoMatched: rest.map((n) => ({ id: n.id, type: n.type, name: n.name })),
    };
  } catch (error) {
    console.error("atlas search failed", error);
    return {
      status: "error",
      query: term,
      message: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
