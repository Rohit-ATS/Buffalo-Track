import * as React from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { getSupabaseBrowser } from "@/lib/supabase.client";

export type GraphNode = {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight: number;
  attributes: Record<string, unknown>;
};

export type RealtimeGraphStatus =
  /** VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY aren't set in this build. */
  | "unconfigured"
  | "loading"
  | "live"
  | "error";

export type RealtimeGraph = {
  status: RealtimeGraphStatus;
  nodes: GraphNode[];
  edges: GraphEdge[];
  error: string | null;
};

function upsert<T extends { id: string }>(rows: Map<string, T>, row: T): Map<string, T> {
  const next = new Map(rows);
  next.set(row.id, row);
  return next;
}

function remove<T>(rows: Map<string, T>, id: string): Map<string, T> {
  if (!rows.has(id)) return rows;
  const next = new Map(rows);
  next.delete(id);
  return next;
}

/**
 * Loads nodes + edges once, then keeps them live via Supabase Realtime.
 * Requires the public-read policies and publication membership from
 * supabase/migrations/20261003000002_public_read_realtime.sql to be applied,
 * and VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to be set (see .env.example).
 *
 * `evidence` isn't included here: its replica identity is left at the
 * primary-key default (see that migration), so it's better fetched on demand
 * per node/edge than streamed wholesale.
 */
export function useRealtimeGraph(): RealtimeGraph {
  const [nodes, setNodes] = React.useState<Map<string, GraphNode>>(new Map());
  const [edges, setEdges] = React.useState<Map<string, GraphEdge>>(new Map());
  const [status, setStatus] = React.useState<RealtimeGraphStatus>("loading");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const db = getSupabaseBrowser();
    if (!db) {
      setStatus("unconfigured");
      return;
    }

    let cancelled = false;

    async function loadInitial() {
      const [nodesRes, edgesRes] = await Promise.all([
        db!.from("nodes").select("id, type, name, attributes"),
        db!.from("edges").select("id, source_id, target_id, type, weight, attributes"),
      ]);
      if (cancelled) return;

      if (nodesRes.error || edgesRes.error) {
        setError((nodesRes.error ?? edgesRes.error)!.message);
        setStatus("error");
        return;
      }

      setNodes(new Map((nodesRes.data as GraphNode[]).map((n) => [n.id, n])));
      setEdges(new Map((edgesRes.data as GraphEdge[]).map((e) => [e.id, e])));
      setStatus("live");
    }

    void loadInitial();

    const onNodeChange = (payload: RealtimePostgresChangesPayload<GraphNode>) => {
      if (payload.eventType === "DELETE") {
        const oldId = (payload.old as { id?: string }).id;
        if (oldId) setNodes((prev) => remove(prev, oldId));
        return;
      }
      setNodes((prev) => upsert(prev, payload.new as GraphNode));
    };

    const onEdgeChange = (payload: RealtimePostgresChangesPayload<GraphEdge>) => {
      if (payload.eventType === "DELETE") {
        const oldId = (payload.old as { id?: string }).id;
        if (oldId) setEdges((prev) => remove(prev, oldId));
        return;
      }
      setEdges((prev) => upsert(prev, payload.new as GraphEdge));
    };

    const channel = db
      .channel("graph")
      .on("postgres_changes", { event: "*", schema: "public", table: "nodes" }, onNodeChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "edges" }, onEdgeChange)
      .subscribe((subStatus) => {
        if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          setError(`Realtime subscription failed: ${subStatus}`);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      void db.removeChannel(channel);
    };
  }, []);

  return {
    status,
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    error,
  };
}
