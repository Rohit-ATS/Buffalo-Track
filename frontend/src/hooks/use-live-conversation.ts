import * as React from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { loadCircleMessages, sendCircleMessage, type CircleMessage } from "@/lib/social";
import { loadPrivateMessages, sendPrivateMessage, type PrivateMessage } from "@/lib/family-network";

/**
 * A conversation that updates as it happens.
 *
 * Loads the backlog once, then subscribes. Realtime honours RLS, so the server
 * only sends a row the viewer's own policy would return — the filter below is
 * about which thread is on screen, not about who is allowed to read it.
 *
 * Sent messages are not echoed locally. The insert comes back through the
 * subscription like anyone else's, which keeps one ordering authority (the
 * database) instead of two that can disagree. The cost is a few hundred
 * milliseconds before your own message appears; the benefit is never showing a
 * message that failed to save.
 */

export type LiveMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type LiveStatus = "unconfigured" | "loading" | "live" | "error";

export type LiveConversation = {
  status: LiveStatus;
  messages: LiveMessage[];
  error: string | null;
  /** Rejects if the insert fails, so the composer can keep the draft. */
  send: (body: string) => Promise<void>;
};

type Kind = "circle" | "private";

function byTime(rows: LiveMessage[]): LiveMessage[] {
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * @param kind   which table to read
 * @param id     circle id, or private conversation id. Null renders an empty,
 *               idle conversation — for "no thread selected yet".
 */
export function useLiveConversation(kind: Kind, id: string | null): LiveConversation {
  const [messages, setMessages] = React.useState<LiveMessage[]>([]);
  const [status, setStatus] = React.useState<LiveStatus>("loading");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) {
      setMessages([]);
      setStatus("live");
      return;
    }

    const client = getSupabaseBrowser();
    if (!client) {
      setStatus("unconfigured");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setMessages([]);

    const table = kind === "circle" ? "circle_messages" : "private_messages";
    const column = kind === "circle" ? "circle_id" : "conversation_id";

    async function loadBacklog() {
      try {
        const rows: (CircleMessage | PrivateMessage)[] =
          kind === "circle" ? await loadCircleMessages(id!) : await loadPrivateMessages(id!);
        if (cancelled) return;
        setMessages(
          byTime(
            rows.map((r) => ({
              id: r.id,
              sender_id: r.sender_id,
              body: r.body,
              created_at: r.created_at,
            })),
          ),
        );
        setStatus("live");
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Could not load this conversation.");
        setStatus("error");
      }
    }

    void loadBacklog();

    const onInsert = (payload: RealtimePostgresChangesPayload<LiveMessage>) => {
      const row = payload.new as LiveMessage | undefined;
      if (!row?.id) return;
      setMessages((prev) =>
        prev.some((m) => m.id === row.id)
          ? prev
          : byTime([
              ...prev,
              {
                id: row.id,
                sender_id: row.sender_id,
                body: row.body,
                created_at: row.created_at,
              },
            ]),
      );
    };

    // A server-side filter, so the client is not woken for every circle's
    // traffic just to discard it.
    const channel = client
      .channel(`${table}:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `${column}=eq.${id}` },
        onInsert,
      )
      .subscribe((subStatus) => {
        if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
          setError(`Live updates unavailable: ${subStatus}`);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [kind, id]);

  const send = React.useCallback(
    async (body: string) => {
      if (!id) return;
      if (kind === "circle") await sendCircleMessage(id, body);
      else await sendPrivateMessage(id, body);
    },
    [kind, id],
  );

  return { status, messages, error, send };
}
