import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const rpc = vi.fn();
  const from = vi.fn();
  return { rpc, from };
});

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseBrowser: () => ({ rpc: state.rpc, from: state.from, auth: {} }),
}));

const {
  PEOPLE_SEARCH_LIMIT,
  loadThreads,
  markRead,
  openDirectConversation,
  personLabel,
  respondToRequest,
  searchPeople,
  shortWhen,
} = await import("@/lib/direct-messages");

describe("people search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.rpc.mockResolvedValue({ data: [], error: null });
  });

  it("asks the opt-in-only function with a bounded page, never the profiles table", async () => {
    await expect(searchPeople("  elena ")).resolves.toEqual([]);

    expect(state.rpc).toHaveBeenCalledWith("search_people", {
      p_query: "elena",
      p_limit: PEOPLE_SEARCH_LIMIT,
    });
    expect(state.from).not.toHaveBeenCalled();
  });

  it("does not query on an empty term", async () => {
    await expect(searchPeople("   ")).resolves.toEqual([]);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("surfaces the database's refusal rather than an empty result", async () => {
    state.rpc.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    await expect(searchPeople("elena")).rejects.toThrow("permission denied");
  });
});

describe("threads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.rpc.mockResolvedValue({ data: [], error: null });
  });

  it("loads the inbox through the summary function", async () => {
    await expect(loadThreads()).resolves.toEqual([]);
    expect(state.rpc).toHaveBeenCalledWith("list_conversations");
    expect(state.from).not.toHaveBeenCalled();
  });

  it("opens a direct conversation by id and returns the thread", async () => {
    state.rpc.mockResolvedValue({ data: "conversation-1", error: null });
    await expect(openDirectConversation("person-2")).resolves.toBe("conversation-1");
    expect(state.rpc).toHaveBeenCalledWith("open_direct_conversation", { p_other_id: "person-2" });
  });

  it("refuses to pretend a conversation opened when nothing came back", async () => {
    state.rpc.mockResolvedValue({ data: null, error: null });
    await expect(openDirectConversation("person-2")).rejects.toThrow(
      "That conversation could not be opened.",
    );
  });

  it("marks a thread read and answers a request through their own functions", async () => {
    await markRead("conversation-1");
    expect(state.rpc).toHaveBeenCalledWith("mark_conversation_read", {
      p_conversation_id: "conversation-1",
    });

    await respondToRequest("conversation-1", false);
    expect(state.rpc).toHaveBeenCalledWith("respond_to_message_request", {
      p_conversation_id: "conversation-1",
      p_accept: false,
    });
  });
});

describe("labels", () => {
  it("falls back to a short id when a name is not ours to read", () => {
    expect(personLabel("Elena Rostova", "abcdef12-3456")).toBe("Elena Rostova");
    expect(personLabel(null, "abcdef12-3456")).toBe("Member abcdef12");
    expect(personLabel("   ", "abcdef12-3456")).toBe("Member abcdef12");
  });

  it("reads a timestamp the way a thread list does", () => {
    const now = Date.now();
    expect(shortWhen(null)).toBe("");
    expect(shortWhen(new Date(now - 30_000).toISOString())).toBe("now");
    expect(shortWhen(new Date(now - 5 * 60_000).toISOString())).toBe("5m");
    expect(shortWhen(new Date(now - 3 * 3_600_000).toISOString())).toBe("3h");
    expect(shortWhen(new Date(now - 2 * 86_400_000).toISOString())).toBe("2d");
  });
});
