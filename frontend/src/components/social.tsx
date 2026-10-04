import { Loader2, Lock, Send, Users } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useLiveConversation } from "@/hooks/use-live-conversation";
import { shortId, type Circle } from "@/lib/social";

/**
 * Groups and conversations on screen.
 *
 * Members are shown as a short id rather than a name. That is not a
 * placeholder: `profiles` is readable only by its owner (0012), so another
 * member's display name genuinely is not ours to fetch. Inventing one would be
 * the same failure as inventing evidence.
 */

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[6px] border border-border bg-surface p-5 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function CircleList({
  circles,
  activeId,
  onOpen,
  onJoin,
  busyId,
}: {
  circles: Circle[];
  activeId: string | null;
  onOpen: (circle: Circle) => void;
  onJoin: (circle: Circle) => void;
  busyId: string | null;
}) {
  if (circles.length === 0) {
    return (
      <Empty>
        No circles yet. A circle is created by a steward for families living with the same biology —
        the atlas will not invent one to fill the screen.
      </Empty>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {circles.map((circle) => {
        const isMember = circle.membership === "active";
        const isPending = circle.membership === "pending";
        const isBlocked = circle.membership === "blocked";
        return (
          <li
            key={circle.id}
            className={`rounded-[6px] border p-4 ${
              activeId === circle.id ? "border-primary" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-xl leading-tight">{circle.name}</h3>
                <p className="mt-1 flex items-center gap-2 text-[11px] uppercase text-muted-foreground">
                  {circle.is_private && <Lock className="size-3" aria-hidden="true" />}
                  <Users className="size-3" aria-hidden="true" />
                  {circle.member_count} member{circle.member_count === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {circle.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {circle.description}
              </p>
            )}

            <div className="mt-4">
              {isMember ? (
                <Button size="sm" variant="outline" onClick={() => onOpen(circle)}>
                  Open conversation
                </Button>
              ) : isPending ? (
                <span className="text-xs text-muted-foreground">
                  Request sent — a steward reviews it privately.
                </span>
              ) : isBlocked ? (
                <span className="text-xs text-muted-foreground">
                  This circle is not open to you.
                </span>
              ) : (
                <Button size="sm" onClick={() => onJoin(circle)} disabled={busyId === circle.id}>
                  {busyId === circle.id ? "Requesting…" : "Ask to join"}
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** A live thread: group or one-to-one. */
export function Conversation({
  kind,
  id,
  title,
  viewerId,
}: {
  kind: "circle" | "private";
  id: string | null;
  title: string;
  viewerId: string | null;
}) {
  const { status, messages, error, send } = useLiveConversation(kind, id);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  // Follow the conversation as it grows.
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setSendError(null);
    try {
      await send(body);
      setDraft("");
    } catch (cause) {
      // The draft is kept on failure — retyping a message because the network
      // blipped is its own small insult.
      setSendError(cause instanceof Error ? cause.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  if (!id) {
    return <Empty>Pick a group or an accepted introduction to open its conversation.</Empty>;
  }

  if (status === "unconfigured") {
    return <Empty>Live messaging needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</Empty>;
  }

  return (
    <section className="flex min-h-0 flex-col rounded-[6px] border border-border">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="font-display text-xl leading-none">{title}</h3>
        <span className="flex items-center gap-1.5 text-[11px] uppercase text-muted-foreground">
          {status === "loading" ? (
            <>
              <Loader2 className="size-3 animate-spin" aria-hidden="true" /> loading
            </>
          ) : status === "live" ? (
            <>
              <span className="size-2 rounded-full bg-primary node-pulse" aria-hidden="true" />
              live
            </>
          ) : (
            "offline"
          )}
        </span>
      </header>

      <div
        className="max-h-[22rem] min-h-[10rem] flex-1 overflow-y-auto px-4 py-3"
        aria-live="polite"
      >
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && messages.length === 0 && status === "live" && (
          <p className="text-sm text-muted-foreground">
            No messages yet. Say hello — everyone here shares the same biology.
          </p>
        )}
        <ul>
          {messages.map((message) => {
            const mine = viewerId !== null && message.sender_id === viewerId;
            return (
              <li
                key={message.id}
                className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-[6px] px-3 py-2 ${
                    mine ? "bg-primary text-primary-foreground" : "bg-surface"
                  }`}
                >
                  {!mine && (
                    <p className="text-[10px] uppercase opacity-70">
                      member {shortId(message.sender_id)}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{message.body}</p>
                  <time
                    className="mt-1 block text-[10px] opacity-60"
                    dateTime={message.created_at}
                    title={new Date(message.created_at).toLocaleString()}
                  >
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
        <label className="sr-only" htmlFor="composer">
          Message
        </label>
        <input
          id="composer"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message"
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="sm" disabled={sending || draft.trim().length === 0}>
          {sending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          <span className="sr-only">Send</span>
        </Button>
      </form>

      {sendError && <p className="px-4 pb-3 text-xs text-destructive">{sendError}</p>}
    </section>
  );
}
