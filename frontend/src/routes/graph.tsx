import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type ForceGraph2DComponent from "react-force-graph-2d";
import { AtlasShell, StateMessage } from "@/components/atlas-ui";
import { useRealtimeGraph, type GraphNode } from "@/hooks/use-realtime-graph";

const SITE = "https://gleam-artistic-page.lovable.app";
export const Route = createFileRoute("/graph")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Live graph — Rare Disease Atlas" },
      {
        name: "description",
        content: "The full node/edge graph, updating live as the database changes.",
      },
      { property: "og:title", content: "Live graph — Rare Disease Atlas" },
      {
        property: "og:description",
        content: "The full node/edge graph, updating live as the database changes.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/graph` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE}/graph` }],
  }),
  component: GraphPage,
});

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

function GraphCanvas({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: { id: string; source_id: string; target_id: string; type: string }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({ width: entry.contentRect.width, height: Math.max(entry.contentRect.height, 480) });
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
      className="h-[70vh] min-h-[480px] w-full overflow-hidden rounded-lg border border-border"
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

function GraphPage() {
  const { status, nodes, edges, error } = useRealtimeGraph();

  return (
    <AtlasShell>
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
        <p className="font-sketch text-2xl text-primary">Live view</p>
        <h1 className="font-display text-4xl md:text-5xl">The graph, updating live</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every node and edge in the database, rendered as a force-directed graph. Changes made
          anywhere — the seed script, the dashboard, another tab — appear here within a second, no
          refresh needed.
        </p>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Legend />
          <span className="shrink-0 text-xs text-muted-foreground">
            {status === "live" && `${nodes.length} nodes · ${edges.length} edges`}
          </span>
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
          {status === "live" && nodes.length === 0 && (
            <StateMessage kind="empty" title="The graph is empty">
              Load supabase/seed.sql (or add rows another way) and they'll appear here live.
            </StateMessage>
          )}
          {status === "live" && nodes.length > 0 && <GraphCanvas nodes={nodes} edges={edges} />}
        </div>
      </div>
    </AtlasShell>
  );
}
