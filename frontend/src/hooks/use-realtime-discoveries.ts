import * as React from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { getSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * Streams discovery activity while a pipeline run is in flight.
 *
 * The pipeline writes rows as each page is processed, so a visitor watching
 * this sees assets appear one at a time rather than after the whole run. That
 * is the only "live" thing here -- the browser never fetches a web page or
 * calls Bright Data itself.
 *
 * Requires the publication membership from
 * supabase/migrations/20261003000006_web_discovery.sql and the VITE_SUPABASE_*
 * vars from .env.example.
 */

export type DiscoveryRunRow = {
  id: string;
  seed_term: string;
  started_at: string;
  finished_at: string | null;
  claims_extracted: number;
  claims_verified: number;
  claims_rejected: number;
};

export type DiscoveredAssetRow = {
  id: string;
  disease_id: string | null;
  kind: string;
  name: string;
  owner: string;
  participants: number | null;
  created_at: string;
};

export type DiscoveryStatus = "unconfigured" | "loading" | "live" | "error";

export type RealtimeDiscoveries = {
  status: DiscoveryStatus;
  runs: DiscoveryRunRow[];
  assets: DiscoveredAssetRow[];
  /** True while any run has started but not finished. */
  running: boolean;
  error: string | null;
};

const RUN_LIMIT = 5;
const ASSET_LIMIT = 50;

function newestFirst<T extends { created_at?: string; started_at?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const left = a.created_at ?? a.started_at ?? "";
    const right = b.created_at ?? b.started_at ?? "";
    return right.localeCompare(left);
  });
}

export function useRealtimeDiscoveries(diseaseId?: string): RealtimeDiscoveries {
  const [runs, setRuns] = React.useState<DiscoveryRunRow[]>([]);
  const [assets, setAssets] = React.useState<DiscoveredAssetRow[]>([]);
  const [status, setStatus] = React.useState<DiscoveryStatus>("loading");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const db = getSupabaseBrowser();
    if (!db) {
      setStatus("unconfigured");
      return;
    }

    let cancelled = false;

    async function loadInitial() {
      const runQuery = db!
        .from("atlas_discovery_runs")
        .select(
          "id, seed_term, started_at, finished_at, claims_extracted, claims_verified, claims_rejected",
        )
        .order("started_at", { ascending: false })
        .limit(RUN_LIMIT);

      let assetQuery = db!
        .from("atlas_discovered_assets")
        .select("id, disease_id, kind, name, owner, participants, created_at")
        .order("created_at", { ascending: false })
        .limit(ASSET_LIMIT);
      if (diseaseId) assetQuery = assetQuery.eq("disease_id", diseaseId);

      const [runRes, assetRes] = await Promise.all([runQuery, assetQuery]);
      if (cancelled) return;

      const failure = runRes.error ?? assetRes.error;
      if (failure) {
        setError(failure.message);
        setStatus("error");
        return;
      }

      setRuns((runRes.data ?? []) as DiscoveryRunRow[]);
      setAssets((assetRes.data ?? []) as DiscoveredAssetRow[]);
      setStatus("live");
    }

    void loadInitial();

    const onRun = (payload: RealtimePostgresChangesPayload<DiscoveryRunRow>) => {
      if (payload.eventType === "DELETE") {
        const gone = (payload.old as { id?: string }).id;
        if (gone) setRuns((prev) => prev.filter((r) => r.id !== gone));
        return;
      }
      const row = payload.new as DiscoveryRunRow;
      setRuns((prev) =>
        newestFirst([row, ...prev.filter((r) => r.id !== row.id)]).slice(0, RUN_LIMIT),
      );
    };

    const onAsset = (payload: RealtimePostgresChangesPayload<DiscoveredAssetRow>) => {
      if (payload.eventType === "DELETE") {
        const gone = (payload.old as { id?: string }).id;
        if (gone) setAssets((prev) => prev.filter((a) => a.id !== gone));
        return;
      }
      const row = payload.new as DiscoveredAssetRow;
      // The subscription is table-wide; filter client-side so one channel
      // serves every disease page.
      if (diseaseId && row.disease_id !== diseaseId) return;
      setAssets((prev) =>
        newestFirst([row, ...prev.filter((a) => a.id !== row.id)]).slice(0, ASSET_LIMIT),
      );
    };

    const channel = db
      .channel("discoveries")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atlas_discovery_runs" },
        onRun,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atlas_discovered_assets" },
        onAsset,
      )
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
  }, [diseaseId]);

  return {
    status,
    runs,
    assets,
    running: runs.some((run) => run.finished_at === null),
    error,
  };
}
