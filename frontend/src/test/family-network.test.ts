import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const limit = vi.fn();
  const order = vi.fn(() => ({ limit }));
  const status = vi.fn(() => ({ order }));
  const recipient = vi.fn(() => ({ eq: status }));
  const select = vi.fn(() => ({ eq: recipient }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  const getUser = vi.fn();

  return { from, getUser, limit, order, recipient, select, status, rpc };
});

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseBrowser: () => ({
    auth: { getUser: state.getUser },
    from: state.from,
    rpc: state.rpc,
  }),
}));

const { INCOMING_INTRODUCTION_PAGE_SIZE, incomingIntroductions, loadPrivateMessages } =
  await import("@/lib/family-network");

describe("incoming introductions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.getUser.mockResolvedValue({ data: { user: { id: "recipient-1" } } });
    state.limit.mockResolvedValue({ data: [] });
  });

  it("loads a bounded newest-first page for the signed-in recipient", async () => {
    await expect(incomingIntroductions()).resolves.toEqual([]);

    expect(state.from).toHaveBeenCalledWith("introduction_requests");
    expect(state.select).toHaveBeenCalledWith("id, sender_id, note, status, created_at");
    expect(state.recipient).toHaveBeenCalledWith("recipient_id", "recipient-1");
    expect(state.status).toHaveBeenCalledWith("status", "pending");
    expect(state.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(state.limit).toHaveBeenCalledWith(INCOMING_INTRODUCTION_PAGE_SIZE);
  });
});

describe("private messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.rpc.mockResolvedValue({ data: [], error: null });
  });

  it("loads history through the bounded membership-checked RPC", async () => {
    await expect(loadPrivateMessages("conversation-1")).resolves.toEqual([]);

    expect(state.rpc).toHaveBeenCalledWith("load_private_messages", {
      p_conversation_id: "conversation-1",
      p_limit: 100,
    });
    expect(state.from).not.toHaveBeenCalled();
  });
});
