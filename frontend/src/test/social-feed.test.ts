import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));
  const getUser = vi.fn();
  return { single, select, insert, from, getUser };
});

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseBrowser: vi.fn(() => ({
    auth: { getUser: state.getUser },
    from: state.from,
  })),
}));

const { getSupabaseBrowser } = await import("@/lib/supabase-browser");
const { publishPost } = await import("@/lib/social-feed");

describe("publishPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseBrowser).mockReturnValue({
      auth: { getUser: state.getUser },
      from: state.from,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    state.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "a@b.com" } } });
  });

  it("throws instead of silently returning an unsaved local post when signed out", async () => {
    state.getUser.mockResolvedValue({ data: { user: null } });

    await expect(publishPost("hello", [], undefined, undefined, null)).rejects.toThrow(
      "Sign in to post.",
    );
    expect(state.from).not.toHaveBeenCalled();
  });

  it("throws instead of silently returning an unsaved local post when Supabase is unconfigured", async () => {
    vi.mocked(getSupabaseBrowser).mockReturnValue(null);

    await expect(publishPost("hello", [], undefined, undefined, null)).rejects.toThrow(
      "configured Supabase connection",
    );
  });

  it("surfaces the real database error instead of hiding it behind a fake post", async () => {
    state.single.mockResolvedValue({ data: null, error: { message: "row violates policy" } });

    await expect(publishPost("hello", [], undefined, undefined, "circle-1")).rejects.toThrow(
      "row violates policy",
    );
  });

  it("writes the chosen circle onto the row, not just the UI", async () => {
    state.single.mockResolvedValue({
      data: {
        id: "row-1",
        author_id: "user-1",
        author_name: "a",
        author_role: "Caregiver",
        condition: "x",
        biology_badge: null,
        body: "hello circle",
        image_url: null,
        tags: [],
        evidence_badge: null,
        evidence_link: null,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        circle_id: "circle-1",
        circles: { name: "STXBP1 Families" },
      },
      error: null,
    });

    const post = await publishPost("hello circle", [], undefined, undefined, "circle-1");

    expect(state.insert).toHaveBeenCalledWith(
      expect.objectContaining({ circle_id: "circle-1", author_id: "user-1" }),
    );
    expect(post.circle_id).toBe("circle-1");
    expect(post.circle_name).toBe("STXBP1 Families");
  });

  it("writes null circle_id for a deliberately public post, not a default guess", async () => {
    state.single.mockResolvedValue({
      data: {
        id: "row-2",
        author_id: "user-1",
        author_name: "a",
        author_role: "Caregiver",
        condition: "x",
        biology_badge: null,
        body: "hello everyone",
        image_url: null,
        tags: [],
        evidence_badge: null,
        evidence_link: null,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        circle_id: null,
        circles: null,
      },
      error: null,
    });

    const post = await publishPost("hello everyone", [], undefined, undefined, null);

    expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({ circle_id: null }));
    expect(post.circle_id).toBeNull();
    expect(post.circle_name).toBeNull();
  });
});
