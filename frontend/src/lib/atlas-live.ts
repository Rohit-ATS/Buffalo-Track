import { createServerFn } from "@tanstack/react-start";

import * as Q from "@/lib/atlas-queries";
import type {
  Bridge,
  Coverage,
  DiseaseRef,
  DuplicateEffort,
  EdgeReceipt,
  GapReport,
  Journey,
  Metric,
  RelatedDisease,
  Resolution,
  SearchMatch,
  SourceRef,
} from "@/lib/atlas-schema";
import { getSupabaseAdmin } from "@/lib/supabase.server";

/**
 * Server functions over the live atlas. The browser calls these over RPC; the
 * handler bodies are stripped from the client bundle, so the service-role key
 * never ships.
 *
 * Each returns a null/empty result rather than throwing when the database is
 * unconfigured, so a view degrades to its curated fallback instead of erroring.
 */

function db() {
  return getSupabaseAdmin();
}

export const atlasSearch = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => ({ query: String(input?.query ?? "") }))
  .handler(async ({ data }): Promise<SearchMatch[]> => {
    const client = db();
    if (!client) return [];
    try {
      return await Q.searchAtlas(client, data.query);
    } catch (error) {
      console.error("atlasSearch failed", error);
      return [];
    }
  });

export const atlasResolve = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => ({ query: String(input?.query ?? "") }))
  .handler(async ({ data }): Promise<Resolution | null> => {
    const client = db();
    if (!client) return null;
    try {
      return await Q.resolveQuery(client, data.query);
    } catch (error) {
      console.error("atlasResolve failed", error);
      return null;
    }
  });

export const atlasJourney = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data }): Promise<Journey | null> => {
    const client = db();
    if (!client || !data.id) return null;
    try {
      return await Q.getJourney(client, data.id);
    } catch (error) {
      console.error("atlasJourney failed", error);
      return null;
    }
  });

export const atlasRelated = createServerFn({ method: "POST" })
  .validator((input: { id: string; limit?: number }) => ({
    id: String(input?.id ?? ""),
    limit: typeof input?.limit === "number" ? input.limit : 6,
  }))
  .handler(async ({ data }): Promise<RelatedDisease[]> => {
    const client = db();
    if (!client || !data.id) return [];
    try {
      return await Q.getRelated(client, data.id, { limit: data.limit });
    } catch (error) {
      console.error("atlasRelated failed", error);
      return [];
    }
  });

/** Same gene, opposite effect class: the counterexample. */
export const atlasNotConnected = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data }): Promise<RelatedDisease[]> => {
    const client = db();
    if (!client || !data.id) return [];
    try {
      return await Q.getNotConnected(client, data.id);
    } catch (error) {
      console.error("atlasNotConnected failed", error);
      return [];
    }
  });

export const atlasEdge = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data }): Promise<EdgeReceipt | null> => {
    const client = db();
    if (!client || !data.id) return null;
    try {
      return await Q.getEdge(client, data.id);
    } catch (error) {
      console.error("atlasEdge failed", error);
      return null;
    }
  });

/** The designed dead end. */
export const atlasGap = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data }): Promise<GapReport | null> => {
    const client = db();
    if (!client || !data.id) return null;
    try {
      return await Q.getGapReport(client, data.id);
    } catch (error) {
      console.error("atlasGap failed", error);
      return null;
    }
  });

export const atlasCoverage = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    coverage: Coverage | null;
    metrics: Metric[];
    sources: SourceRef[];
  }> => {
    const client = db();
    if (!client) return { coverage: null, metrics: [], sources: [] };
    try {
      const [coverage, metrics, sources] = await Promise.all([
        Q.getCoverage(client),
        Q.getMetrics(client),
        Q.getSources(client),
      ]);
      return { coverage, metrics, sources };
    } catch (error) {
      console.error("atlasCoverage failed", error);
      return { coverage: null, metrics: [], sources: [] };
    }
  },
);

export const atlasBridges = createServerFn({ method: "GET" }).handler(
  async (): Promise<Bridge[]> => {
    const client = db();
    if (!client) return [];
    try {
      return await Q.getBridges(client);
    } catch (error) {
      console.error("atlasBridges failed", error);
      return [];
    }
  },
);

export const atlasDuplicateEffort = createServerFn({ method: "GET" }).handler(
  async (): Promise<DuplicateEffort[]> => {
    const client = db();
    if (!client) return [];
    try {
      return await Q.getDuplicateEffort(client);
    } catch (error) {
      console.error("atlasDuplicateEffort failed", error);
      return [];
    }
  },
);

/** Priya's view: filter units by effect class and pathway. */
export const atlasMechanismSearch = createServerFn({ method: "POST" })
  .validator((input: { effectClass?: string; pathway?: string }) => ({
    effectClass: input?.effectClass ? String(input.effectClass) : undefined,
    pathway: input?.pathway ? String(input.pathway) : undefined,
  }))
  .handler(async ({ data }): Promise<DiseaseRef[]> => {
    const client = db();
    if (!client) return [];
    try {
      return await Q.searchByMechanism(client, data);
    } catch (error) {
      console.error("atlasMechanismSearch failed", error);
      return [];
    }
  });

export const atlasDiseases = createServerFn({ method: "GET" }).handler(
  async (): Promise<DiseaseRef[]> => {
    const client = db();
    if (!client) return [];
    try {
      return await Q.listDiseases(client);
    } catch (error) {
      console.error("atlasDiseases failed", error);
      return [];
    }
  },
);
