import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type ForceGraph2DComponent from "react-force-graph-2d";
import { StateMessage } from "@/components/atlas-ui";
import { useRealtimeGraph, type GraphEdge, type GraphNode } from "@/hooks/use-realtime-graph";

// react-force-graph-2d touches `window`/canvas at import time, so it can't be
// evaluated during SSR. Lazy-load it and only render once mounted client-side.
// React.lazy() erases the component's generics, so recast to the real type —
// a compile-time-only correction; the runtime value is still the lazy wrapper.
const ForceGraph2D = lazy(
  () => import("react-force-graph-2d"),
) as unknown as typeof ForceGraph2DComponent;

type GraphNodeDatum = { name: string; type: string };
type GraphLinkDatum = { type: string };

const NODE_COLOR: Record<string, string> = {
  gene: "#f97316", // orange
  mechanism: "#a855f7", // purple
  disorder: "#ef4444", // red
  organization: "#3b82f6", // blue
  asset: "#22c55e", // green
};
const DEFAULT_COLOR = "#94a3b8"; // slate, for any type not in the map above

function GraphCanvas({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({ width: entry.contentRect.width, height: Math.max(entry.contentRect.height, 420) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ id: n.id, name: n.name, type: n.type })),
      links: edges.map((e) => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        type: e.type,
      })),
    }),
    [nodes, edges],
  );

  return (
    <div
      ref={containerRef}
      className="h-[60vh] min-h-[420px] w-full overflow-hidden rounded-lg border border-border"
    >
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading graph renderer…
          </div>
        }
      >
        <ForceGraph2D<GraphNodeDatum, GraphLinkDatum>
          graphData={graphData}
          width={size.width}
          height={size.height}
          nodeId="id"
          nodeLabel={(n) => `${n.name} (${n.type})`}
          nodeColor={(n) => NODE_COLOR[n.type] ?? DEFAULT_COLOR}
          nodeRelSize={5}
          linkLabel={(l) => l.type}
          linkColor={() => "rgba(148, 163, 184, 0.5)"}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          cooldownTicks={100}
        />
      </Suspense>
    </div>
  );
}

function Legend() {
  const entries = Object.entries(NODE_COLOR);
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {entries.map(([type, color]) => (
        <span key={type} className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
          {type}
        </span>
      ))}
    </div>
  );
}

/**
 * The live graph (all nodes/edges, updating in real time via Realtime
 * subscriptions), optionally narrowed to a single node type plus its direct
 * neighbors. Pass `focusType="mechanism"` to show only mechanism nodes and
 * whatever they connect to — the shape /mechanisms needs — or omit it for
 * the full graph.
 */
export function LiveGraph({
  title,
  description,
  focusType,
}: {
  title: string;
  description: string;
  focusType?: string;
}) {
  const { status, nodes, edges, error } = useRealtimeGraph();
  const [showAll, setShowAll] = useState(!focusType);

  const { visibleNodes, visibleEdges } = useMemo(() => {
    if (showAll || !focusType) return { visibleNodes: nodes, visibleEdges: edges };

    const focusIds = new Set(nodes.filter((n) => n.type === focusType).map((n) => n.id));
    const neighborIds = new Set(focusIds);
    const relevantEdges = edges.filter((e) => {
      const touchesFocus = focusIds.has(e.source_id) || focusIds.has(e.target_id);
      if (touchesFocus) {
        neighborIds.add(e.source_id);
        neighborIds.add(e.target_id);
      }
      return touchesFocus;
    });
    return {
      visibleNodes: nodes.filter((n) => neighborIds.has(n.id)),
      visibleEdges: relevantEdges,
    };
  }, [nodes, edges, showAll, focusType]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {focusType && status === "live" && (
          <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="size-3.5"
            />
            Show full graph
          </label>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <Legend />
        {status === "live" && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {visibleNodes.length} nodes · {visibleEdges.length} edges
          </span>
        )}
      </div>

      <div className="mt-4">
        {status === "unconfigured" && (
          <StateMessage kind="empty" title="Live graph not connected">
            This build has no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, so the graph can't reach
            the database. Fill in frontend/.env and reload.
          </StateMessage>
        )}
        {status === "loading" && <StateMessage kind="loading" title="Loading graph…" />}
        {status === "error" && (
          <StateMessage kind="error" title="Couldn't load the graph">
            {error}
          </StateMessage>
        )}
        {status === "live" && visibleNodes.length === 0 && (
          <StateMessage kind="empty" title="Nothing to show yet">
            {focusType && !showAll
              ? `No "${focusType}" nodes in the database yet.`
              : "Load supabase/seed.sql (or add rows another way) and they'll appear here live."}
          </StateMessage>
        )}
        {status === "live" && visibleNodes.length > 0 && (
          <GraphCanvas nodes={visibleNodes} edges={visibleEdges} />
        )}
      </div>
    </div>
  );
}
