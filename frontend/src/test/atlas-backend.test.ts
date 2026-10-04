import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchAtlas } = await import("@/lib/atlas-search");

describe("frontend to backend atlas search", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_BACKEND_URL", "https://api.example.org/");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("forwards the query to the configured backend and returns its response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "empty",
          query: "UNSEEDED",
          message: null,
          match: null,
          alsoMatched: null,
        }),
        { status: 200 },
      ),
    );

    await expect(searchAtlas({ data: { query: "UNSEEDED" } })).resolves.toMatchObject({
      status: "empty",
      query: "UNSEEDED",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.org/api/v1/search",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ query: "UNSEEDED" }) }),
    );
    const headers = vi.mocked(fetch).mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
  });

  it("uses a curated route when the live database has not seeded it yet", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "empty", query: "SCN1A" }), { status: 200 }),
    );

    await expect(searchAtlas({ data: { query: "SCN1A" } })).resolves.toMatchObject({
      status: "fallback",
      query: "SCN1A",
      matches: expect.arrayContaining([
        expect.objectContaining({ diseaseId: "scn1a", type: "gene" }),
      ]),
    });
  });

  it("returns the documented fallback without calling the network when no backend URL exists", async () => {
    vi.stubEnv("VITE_BACKEND_URL", "");

    await expect(searchAtlas({ data: { query: "STXBP1" } })).resolves.toMatchObject({
      status: "fallback",
      query: "STXBP1",
      matches: expect.any(Array),
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps backend rate limiting to a retryable UI error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("too many requests", { status: 429 }));

    await expect(searchAtlas({ data: { query: "STXBP1" } })).resolves.toEqual({
      status: "error",
      query: "STXBP1",
      message: "The atlas is handling many searches. Please try again shortly.",
    });
  });
});
