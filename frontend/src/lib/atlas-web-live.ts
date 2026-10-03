import { createServerFn } from "@tanstack/react-start";

import * as W from "@/lib/atlas-web-evidence";
import { getSupabaseAdmin } from "@/lib/supabase.server";

/**
 * RPC entry points for discovered web evidence.
 *
 * These read what a pipeline run stored. None of them triggers a fetch or a
 * Bright Data call, so a page view costs nothing no matter how many people
 * load it -- which is the point of running discovery offline.
 */

export const webAssets = createServerFn({ method: "POST" })
  .validator((input: { diseaseId: string }) => ({
    diseaseId: String(input?.diseaseId ?? ""),
  }))
  .handler(async ({ data }): Promise<W.DiscoveredAsset[]> => {
    const db = getSupabaseAdmin();
    if (!db || !data.diseaseId) return [];
    try {
      return await W.getDiscoveredAssets(db, data.diseaseId);
    } catch (error) {
      console.error("webAssets failed", error);
      return [];
    }
  });

/** Backs the "Verify on Web" drawer: every claim made from one page. */
export const webEvidence = createServerFn({ method: "POST" })
  .validator((input: { sourceId: string }) => ({
    sourceId: String(input?.sourceId ?? ""),
  }))
  .handler(async ({ data }): Promise<W.WebEvidence[]> => {
    const db = getSupabaseAdmin();
    if (!db || !data.sourceId) return [];
    try {
      return await W.getWebEvidenceForSource(db, data.sourceId);
    } catch (error) {
      console.error("webEvidence failed", error);
      return [];
    }
  });

/** The extraction rejection rate for the methods page. */
export const webQuality = createServerFn({ method: "GET" }).handler(
  async (): Promise<W.ExtractionQuality | null> => {
    const db = getSupabaseAdmin();
    if (!db) return null;
    try {
      return await W.getExtractionQuality(db);
    } catch (error) {
      console.error("webQuality failed", error);
      return null;
    }
  },
);

export const webRuns = createServerFn({ method: "GET" }).handler(
  async (): Promise<W.DiscoveryRun[]> => {
    const db = getSupabaseAdmin();
    if (!db) return [];
    try {
      return await W.getRecentRuns(db);
    } catch (error) {
      console.error("webRuns failed", error);
      return [];
    }
  },
);
