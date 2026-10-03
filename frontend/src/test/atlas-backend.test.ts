import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  handler: undefined as ((context: { data: { query: string } }) => Promise<unknown>) | undefined,
  cookie: undefined as string | undefined,
  setCookie: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: (handler: (context: { data: { query: string } }) => Promise<unknown>) => {
        state.handler = handler;
        return handler;
      },
    }),
  }),
}));

vi.mock("@tanstack/react-start/server", () => ({
  getCookie: () => state.cookie,
  setCookie: state.setCookie,
}));

const { searchAtlas } = await import("@/lib/atlas-search");

describe("frontend to backend atlas search", () => {
  beforeEach(() => {
    process.env["BACKEND_URL"] = "https://api.example.org/";
    process.env["BACKEND_PROXY_SECRET"] = "a".repeat(32);
    state.cookie = undefined;
    state.setCookie.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("forwards the query to the configured backend and returns its response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "empty",
          query: "STXBP1",
          message: null,
          match: null,
          alsoMatched: null,
        }),
        { status: 200 },
      ),
    );

    await expect(searchAtlas({ data: { query: "STXBP1" } })).resolves.toMatchObject({
      status: "empty",
      query: "STXBP1",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.org/api/v1/search",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ query: "STXBP1" }) }),
    );
    const headers = vi.mocked(fetch).mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-buffalo-client-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers["x-buffalo-client-signature"]).toHaveLength(64);
    expect(state.setCookie).toHaveBeenCalledOnce();
  });

  it("returns the documented fallback without calling the network when no backend URL exists", async () => {
    delete process.env["BACKEND_URL"];

    await expect(searchAtlas({ data: { query: "STXBP1" } })).resolves.toEqual({
      status: "unconfigured",
      query: "STXBP1",
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
