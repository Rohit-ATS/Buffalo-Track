import { getSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * Direct messages.
 *
 * Every call here is an RPC, not a table read. That is not ceremony: `profiles`
 * is readable only by its owner and `private_messages` is revoked from
 * `authenticated` entirely (migrations 0012 and 0017), so the database is the
 * only place that can decide which name, which thread and which message is
 * yours to see. The browser asks; the function answers.
 *
 * See supabase/migrations/20261004000020_direct_messages.sql for the rules:
 * discovery is opt-in, a first message from a stranger lands in Requests and is
 * capped at three until accepted, and a block closes the thread both ways.
 */

export type DirectThread = {
  conversation_id: string;
  kind: "direct" | "introduction";
  /** The viewer's own side: an unanswered request is not in the inbox yet. */
  state: "accepted" | "request";
  other_id: string | null;
  /** Null when the other person has not published a name — show a short id. */
  other_name: string | null;
  other_avatar: string | null;
  other_condition: string | null;
  last_body: string | null;
  last_sender_id: string | null;
  last_at: string | null;
  unread_count: number;
};

export type PersonResult = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  condition: string | null;
};

export const PEOPLE_SEARCH_LIMIT = 10;

function db() {
  const client = getSupabaseBrowser();
  if (!client) {
    throw new Error(
      "Supabase is not configured in this build. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return client;
}

/** People who opted into being found, minus anyone either side has blocked. */
export async function searchPeople(query: string): Promise<PersonResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await db().rpc("search_people", {
    p_query: trimmed,
    p_limit: PEOPLE_SEARCH_LIMIT,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as PersonResult[];
}

/** Every thread the viewer is in, newest activity first. */
export async function loadThreads(): Promise<DirectThread[]> {
  const { data, error } = await db().rpc("list_conversations");
  if (error) throw new Error(error.message);
  return (data ?? []) as DirectThread[];
}

/** Opens the thread with someone, or returns the one that already exists. */
export async function openDirectConversation(otherId: string): Promise<string> {
  const { data, error } = await db().rpc("open_direct_conversation", { p_other_id: otherId });
  if (error) throw new Error(error.message);
  if (typeof data !== "string") throw new Error("That conversation could not be opened.");
  return data;
}

export async function markRead(conversationId: string): Promise<void> {
  const { error } = await db().rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
}

export async function respondToRequest(conversationId: string, accept: boolean): Promise<void> {
  const { error } = await db().rpc("respond_to_message_request", {
    p_conversation_id: conversationId,
    p_accept: accept,
  });
  if (error) throw new Error(error.message);
}

/** What to call someone whose name is not ours to read. */
export function personLabel(name: string | null, id: string | null): string {
  if (name && name.trim()) return name.trim();
  return id ? `Member ${id.slice(0, 8)}` : "Member";
}

export function initials(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

/** "now", "4m", "3h", "2d", then a date — the way a thread list reads. */
export function shortWhen(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}
