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

  it("offers curated matches as a labeled supplement when live verified there is nothing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "empty", query: "SCN1A" }), { status: 200 }),
    );

    await expect(searchAtlas({ data: { query: "SCN1A" } })).resolves.toMatchObject({
      status: "fallback",
      reason: "no-live-match",
      query: "SCN1A",
      matches: expect.arrayContaining([
        expect.objectContaining({ diseaseId: "scn1a", type: "gene" }),
      ]),
    });
  });

  it("never relabels a real backend search failure as empty or as 'not yet verified'", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "error",
          query: "STXBP1",
          message: "The atlas database is temporarily unavailable.",
        }),
        { status: 200 },
      ),
    );

    await expect(searchAtlas({ data: { query: "STXBP1" } })).resolves.toMatchObject({
      status: "fallback",
      reason: "unavailable",
      query: "STXBP1",
      message: "The atlas database is temporarily unavailable.",
    });
  });

  it("reports an unconfigured build honestly instead of as a live outage", async () => {
    vi.stubEnv("VITE_BACKEND_URL", "");

    await expect(searchAtlas({ data: { query: "STXBP1" } })).resolves.toMatchObject({
      status: "unconfigured",
      query: "STXBP1",
      matches: expect.any(Array),
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports a network failure as the live atlas being unavailable, not silently as empty", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("network error"));

    await expect(searchAtlas({ data: { query: "STXBP1" } })).resolves.toMatchObject({
      status: "fallback",
      reason: "unavailable",
      query: "STXBP1",
    });
  });

  it("maps backend rate limiting to a retryable UI error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("too many requests", { status: 429 }));

    await expect(searchAtlas({ data: { query: "STXBP1" } })).resolves.toEqual({
      status: "error",
      query: "STXBP1",
      message: "The atlas is handling many searches right now. Please try again shortly.",
    });
  });
});
