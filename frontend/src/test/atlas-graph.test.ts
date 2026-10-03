import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { runAtlasSearch } from "@/lib/atlas-graph";

/**
 * A fake PostgREST query builder: every filter method returns `this`, and the
 * chain resolves to whatever rows the table fixture holds. `calls` records the
 * filters so we can assert on the three-pass matching and column selection.
 */
type TableRows = Record<string, unknown[]>;

function fakeDb(tables: TableRows, options: { failOn?: string } = {}) {
  const calls: { table: string; select?: string; or?: string; limit?: number }[] = [];
  let nodeSelectCount = 0;

  const db = {
    from(table: string) {
      const call: { table: string; select?: string; or?: string; limit?: number } = { table };
      calls.push(call);

      const rowsFor = (): unknown[] => {
        if (options.failOn === table) return [];
        if (table !== "nodes") return tables[table] ?? [];
        // First `nodes` select is the match lookup; later ones resolve neighbours.
        nodeSelectCount += 1;
        const key = nodeSelectCount === 1 ? "nodes" : "neighbors";
        return tables[key] ?? [];
      };

      const builder: Record<string, unknown> = {
        then(resolve: (value: unknown) => unknown) {
          if (options.failOn === table) {
            return Promise.resolve(
              resolve({ data: null, error: { message: `${table} exploded` } }),
            );
          }
          return Promise.resolve(resolve({ data: rowsFor(), error: null }));
        },
      };
      for (const method of ["select", "or", "limit", "in", "eq", "order"]) {
        builder[method] = (...args: unknown[]) => {
          if (method === "select") call.select = args[0] as string;
          if (method === "or") call.or = args[0] as string;
          if (method === "limit") call.limit = args[0] as number;
          return builder;
        };
      }
      return builder;
    },
  };

  return { db: db as unknown as SupabaseClient, calls };
}

describe("runAtlasSearch", () => {
  it("reports unconfigured when there is no client", async () => {
    const result = await runAtlasSearch(null, "STXBP1");
    expect(result).toEqual({ status: "unconfigured", query: "STXBP1" });
  });

  it("reports empty for a blank query without touching the database", async () => {
    const { db, calls } = fakeDb({});
    const result = await runAtlasSearch(db, "   ");
    expect(result.status).toBe("empty");
    expect(calls).toHaveLength(0);
  });

  it("matches on the exact term first and does not run the fallback passes", async () => {
    const { db, calls } = fakeDb({
      nodes: [{ id: "n1", type: "gene", name: "STXBP1" }],
      edges: [],
      evidence: [],
    });

    const result = await runAtlasSearch(db, "STXBP1");

    expect(result.status).toBe("ok");
    const nodeLookups = calls.filter((c) => c.table === "nodes" && c.or);
    expect(nodeLookups).toHaveLength(1);
    // Exact pass: no leading/trailing wildcard.
    expect(nodeLookups[0]?.or).toBe("name.ilike.STXBP1,type.ilike.STXBP1");
  });

  it("falls back to prefix then substring when earlier passes find nothing", async () => {
    const { db, calls } = fakeDb({ nodes: [], edges: [], evidence: [] });

    const result = await runAtlasSearch(db, "SNARE");

    expect(result.status).toBe("empty");
    const patterns = calls.filter((c) => c.table === "nodes").map((c) => c.or);
    expect(patterns).toEqual([
      "name.ilike.SNARE,type.ilike.SNARE",
      "name.ilike.SNARE%,type.ilike.SNARE%",
      "name.ilike.%SNARE%,type.ilike.%SNARE%",
    ]);
  });

  it("sanitizes the term before it reaches the filter expression", async () => {
    const { db, calls } = fakeDb({ nodes: [], edges: [], evidence: [] });

    await runAtlasSearch(db, "STX1B,name.ilike.*");

    // The injected comma is gone, so the `.or()` expression stays two clauses.
    expect(calls[0]?.or).toBe("name.ilike.STX1B name.ilike.,type.ilike.STX1B name.ilike.");
  });

  it("resolves edge direction, neighbours, and per-edge evidence counts", async () => {
    const { db } = fakeDb({
      nodes: [{ id: "n1", type: "disorder", name: "STXBP1-related disorder" }],
      neighbors: [
        { id: "n2", type: "organization", name: "STXBP1 Foundation" },
        { id: "n3", type: "disorder", name: "STX1B-related epilepsy" },
      ],
      edges: [
        { id: "e1", source_id: "n1", target_id: "n2", type: "supported_by", weight: 0.99 },
        { id: "e2", source_id: "n3", target_id: "n1", type: "shares_mechanism", weight: 0.86 },
      ],
      evidence: [{ edge_id: "e1" }, { edge_id: "e1" }, { edge_id: "e2" }],
    });

    const result = await runAtlasSearch(db, "STXBP1-related disorder");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const [outgoing, incoming] = result.match.connections;
    expect(outgoing).toMatchObject({
      direction: "outgoing",
      type: "supported_by",
      evidenceCount: 2,
    });
    expect(outgoing?.neighbor.name).toBe("STXBP1 Foundation");
    expect(incoming).toMatchObject({
      direction: "incoming",
      type: "shares_mechanism",
      evidenceCount: 1,
    });
    expect(incoming?.neighbor.name).toBe("STX1B-related epilepsy");
  });

  it("never selects the embedding column", async () => {
    const { db, calls } = fakeDb({
      nodes: [{ id: "n1", type: "gene", name: "STXBP1" }],
      edges: [],
      evidence: [],
    });

    await runAtlasSearch(db, "STXBP1");

    for (const call of calls) {
      expect(call.select ?? "").not.toContain("embedding");
    }
  });

  it("returns an error result instead of throwing when a query fails", async () => {
    const { db } = fakeDb({ nodes: [] }, { failOn: "nodes" });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await runAtlasSearch(db, "STXBP1");

    expect(result).toMatchObject({ status: "error", message: "nodes exploded" });
    spy.mockRestore();
  });
});
