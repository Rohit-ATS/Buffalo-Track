import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import * as Q from "@/lib/atlas-queries";

/**
 * Integration tests against a real Postgres + PostgREST.
 *
 * These exercise the queries the unit tests cannot: PostgREST embedded
 * relations, the `atlas_coverage` / `atlas_duplicate_effort` views, enum
 * columns, and the check constraints.
 *
 * Skipped unless ATLAS_TEST_URL and ATLAS_TEST_KEY are set. To run them:
 *
 *   npx supabase start
 *   docker exec -i supabase_db_<ref> psql -U postgres -d postgres < supabase/seed_atlas.sql
 *   ATLAS_TEST_URL=http://127.0.0.1:54321 ATLAS_TEST_KEY=<service_role key> bun run test
 *
 * `npx supabase status` prints both values.
 */
const url = process.env["ATLAS_TEST_URL"];
const key = process.env["ATLAS_TEST_KEY"];
const live = Boolean(url && key);

describe.skipIf(!live)("atlas queries against a live database", () => {
  let db: SupabaseClient;

  beforeAll(() => {
    db = createClient(url!, key!, { auth: { persistSession: false } });
  });

  it("finds a gene, a synonym, a symptom, an organization and a mechanism", async () => {
    const cases: [string, string][] = [
      ["STXBP1", "gene"],
      ["DEE4", "synonym"],
      ["Ohtahara", "synonym"],
      ["febrile seizures", "symptom"],
      ["STXBP1 Foundation", "patient group"],
      ["Presynaptic vesicle release", "mechanism"],
    ];

    for (const [term, expected] of cases) {
      const matches = await Q.searchAtlas(db, term);
      expect(matches.length, `no hit for ${term}`).toBeGreaterThan(0);
      expect(matches[0]?.type, `wrong type for ${term}`).toBe(expected);
    }
  });

  it("resolves a synonym to its canonical unit", async () => {
    const resolution = await Q.resolveQuery(db, "Ohtahara");
    expect(resolution?.disease.id).toBe("stxbp1");
    expect(resolution?.matchedOn).toBe("synonym");
    expect(resolution?.synonyms).toContain("DEE4");
  });

  it("builds a journey with receipts, assets and open questions", async () => {
    const journey = await Q.getJourney(db, "stx1b");
    expect(journey).not.toBeNull();
    expect(journey!.related.length).toBeGreaterThan(0);
    expect(journey!.edges.length).toBeGreaterThan(0);
    expect(journey!.openQuestions.length).toBeGreaterThan(0);
    // Every edge must carry the rule behind its confidence.
    expect(journey!.edges.every((e) => e.rule.length > 0)).toBe(true);
    expect(journey!.edges.some((e) => e.source !== null)).toBe(true);
  });

  it("keeps similarity split into mechanism and phenotype", async () => {
    const related = await Q.getRelated(db, "stxbp1", { limit: 3 });
    expect(related.length).toBeGreaterThan(0);
    for (const r of related) {
      expect(r.similarity.mechanism).toBeTypeOf("number");
      expect(r.similarity.phenotype).toBeTypeOf("number");
      // combined is 0.6 mechanism + 0.4 phenotype, stored so it is auditable.
      const expected = 0.6 * r.similarity.mechanism + 0.4 * r.similarity.phenotype;
      expect(r.similarity.combined).toBeCloseTo(Math.min(1, expected), 3);
    }
  });

  it("refuses to connect one gene's opposite effect classes", async () => {
    const blocked = await Q.getNotConnected(db, "cacna1a-ea2");
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked[0]?.disease.id).toBe("cacna1a-fhm1");
    expect(blocked[0]?.similarity.blockedReason).toMatch(/different effect class/i);

    // ...and keeps them out of the ordinary related list.
    const related = await Q.getRelated(db, "cacna1a-ea2");
    expect(related.some((r) => r.disease.id === "cacna1a-fhm1")).toBe(false);
  });

  it("reports an honest gap for a unit with no route", async () => {
    const gap = await Q.getGapReport(db, "vamp2");
    expect(gap).not.toBeNull();
    expect(gap!.disease.noRoute).toBe(true);
    expect(gap!.missing.length).toBeGreaterThan(0);
    expect(gap!.searchedSources.length).toBeGreaterThan(0);
    expect(gap!.nearest.length).toBeGreaterThan(0);
    expect(gap!.whatWouldChangeIt.length).toBeGreaterThan(0);
  });

  it("serves live coverage and quality metrics", async () => {
    const coverage = await Q.getCoverage(db);
    expect(coverage.diseases).toBeGreaterThan(0);
    expect(coverage.connections).toBeGreaterThan(0);
    expect(coverage.observedEdges + coverage.reportedEdges + coverage.inferredEdges).toBe(
      coverage.connections,
    );

    const metrics = await Q.getMetrics(db);
    expect(metrics.length).toBeGreaterThan(0);
    // Snapshot quotes are not machine-verified, and the metric must say so.
    expect(metrics.find((m) => m.key === "quote_verified")?.value).toBe(0);
  });

  it("flags communities independently building the same kind of asset", async () => {
    const dupes = await Q.getDuplicateEffort(db);
    expect(dupes.length).toBeGreaterThan(0);
    expect(dupes.every((d) => d.ownerCount > 1)).toBe(true);
  });

  it("filters units by effect class for the mechanism view", async () => {
    const gain = await Q.searchByMechanism(db, { effectClass: "gain-of-function" });
    expect(gain.length).toBeGreaterThan(0);
    expect(gain.every((d) => d.effectClass === "gain-of-function")).toBe(true);
  });

  it("returns a complete receipt for one edge", async () => {
    const edge = await Q.getEdge(db, "e1");
    expect(edge).not.toBeNull();
    expect(edge!.source).not.toBeNull();
    expect(edge!.rule.length).toBeGreaterThan(0);
    expect(edge!.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(edge!.confidence).toBeGreaterThan(0);
  });
});
