import { ArrowLeft, Loader2, MessageCircle, Search, Send, SquarePen, Users, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { useLiveConversation } from "@/hooks/use-live-conversation";
import {
  initials,
  loadThreads,
  markRead,
  openDirectConversation,
  personLabel,
  respondToRequest,
  searchPeople,
  shortWhen,
  type DirectThread,
  type PersonResult,
} from "@/lib/direct-messages";
import { loadCircles, shortId, type Circle } from "@/lib/social";

/**
 * Direct messages, the shape people already know: an inbox on the left, the
 * open conversation on the right, a pencil to start a new one.
 *
 * Two things differ from a consumer social app, on purpose. Someone only
 * appears in search if they turned on matching, because a profile here is a
 * medical one. And a first message from a stranger lands in Requests rather
 * than the inbox, so a family is never cornered by someone they did not choose
 * to hear from. Both rules are enforced in the database, not here.
 */

type Selection =
  | { kind: "private"; id: string; thread: DirectThread }
  | { kind: "circle"; id: string; circle: Circle };

function Avatar({
  label,
  src,
  size = "size-12",
}: {
  label: string;
  src?: string | null;
  size?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${size} shrink-0 rounded-full object-cover`}
        loading="lazy"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${size} grid shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary`}
    >
      {initials(label)}
    </span>
  );
}

export function DirectMessages({ viewerId }: { viewerId: string | null }) {
  const [threads, setThreads] = React.useState<DirectThread[]>([]);
  const [circles, setCircles] = React.useState<Circle[]>([]);
  const [selection, setSelection] = React.useState<Selection | null>(null);
  const [folder, setFolder] = React.useState<"primary" | "requests">("primary");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [composing, setComposing] = React.useState(false);

  // The open thread, for the poll below: anything arriving in a conversation
  // you are reading is already read, so it must not come back as unread.
  const openId = React.useRef<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const [nextThreads, nextCircles] = await Promise.all([
        loadThreads(),
        loadCircles().catch(() => [] as Circle[]),
      ]);
      const reading = openId.current;
      if (reading && nextThreads.some((t) => t.conversation_id === reading && t.unread_count > 0)) {
        void markRead(reading).catch(() => {});
      }
      setThreads(
        reading
          ? nextThreads.map((t) => (t.conversation_id === reading ? { ...t, unread_count: 0 } : t))
          : nextThreads,
      );
      setCircles(nextCircles.filter((circle) => circle.membership === "active"));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Messages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    // The inbox is a summary the database builds (last message, unread count),
    // so it is polled rather than subscribed to. The open conversation itself
    // is live; this is only the list beside it.
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const primary = threads.filter((thread) => thread.state === "accepted");
  const requests = threads.filter((thread) => thread.state === "request");
  const shown = folder === "primary" ? primary : requests;

  // Keep the open thread in step with the polled list, so a new message updates
  // the request banner and the unread count without reopening the thread.
  React.useEffect(() => {
    if (selection?.kind !== "private") return;
    const fresh = threads.find((t) => t.conversation_id === selection.id);
    if (fresh && fresh !== selection.thread) {
      setSelection({ kind: "private", id: fresh.conversation_id, thread: fresh });
    }
  }, [threads, selection]);

  async function openThread(thread: DirectThread) {
    setSelection({ kind: "private", id: thread.conversation_id, thread });
    openId.current = thread.conversation_id;
    if (thread.unread_count > 0) {
      try {
        await markRead(thread.conversation_id);
        setThreads((prev) =>
          prev.map((t) =>
            t.conversation_id === thread.conversation_id ? { ...t, unread_count: 0 } : t,
          ),
        );
      } catch {
        // A read receipt that does not save is not worth an error on screen.
      }
    }
  }

  async function startWith(person: PersonResult) {
    const id = await openDirectConversation(person.id);
    setComposing(false);
    setFolder("primary");
    const fresh = await loadThreads();
    setThreads(fresh);
    const opened = fresh.find((thread) => thread.conversation_id === id);
    if (opened) void openThread(opened);
  }

  async function answerRequest(conversationId: string, accept: boolean) {
    await respondToRequest(conversationId, accept);
    if (!accept) {
      openId.current = null;
      setSelection(null);
    }
    setFolder(accept ? "primary" : "requests");
    await refresh();
  }

  const listPane = (
    <div
      className={`flex min-h-0 w-full shrink-0 flex-col border-border md:w-[340px] md:border-r xl:w-[380px] ${
        selection ? "hidden md:flex" : "flex"
      }`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
        <h2 className="font-display text-2xl leading-none">Messages</h2>
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="New message"
        >
          <SquarePen className="size-5" />
          <span className="sr-only">New message</span>
        </button>
      </header>

      <div className="flex gap-1 border-b border-border px-3 py-2 text-sm">
        {(["primary", "requests"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFolder(tab)}
            className={`flex-1 rounded-full px-3 py-1.5 font-semibold capitalize transition-colors ${
              folder === tab ? "bg-foreground text-background" : "hover:bg-surface"
            }`}
          >
            {tab}
            {tab === "requests" && requests.length > 0 && ` · ${requests.length}`}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <p className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…
          </p>
        )}
        {error && <p className="px-5 py-4 text-sm text-destructive">{error}</p>}

        {folder === "primary" && circles.length > 0 && (
          <div className="pt-2">
            <p className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Groups
            </p>
            {circles.map((circle) => (
              <button
                key={circle.id}
                type="button"
                onClick={() => {
                  openId.current = null;
                  setSelection({ kind: "circle", id: circle.id, circle });
                }}
                className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface ${
                  selection?.id === circle.id ? "bg-surface" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-highlight/40 text-primary"
                >
                  <Users className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{circle.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {circle.member_count} member{circle.member_count === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            ))}
            <p className="px-5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              People
            </p>
          </div>
        )}

        {!loading && shown.length === 0 && (
          <p className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">
            {folder === "primary"
              ? "No conversations yet. The pencil above finds anyone who has opted into being contacted."
              : "No message requests. A first message from someone you have not met waits here."}
          </p>
        )}

        <ul>
          {shown.map((thread) => {
            const label = personLabel(thread.other_name, thread.other_id);
            const mine = thread.last_sender_id && thread.last_sender_id === viewerId;
            return (
              <li key={thread.conversation_id}>
                <button
                  type="button"
                  onClick={() => void openThread(thread)}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface ${
                    selection?.id === thread.conversation_id ? "bg-surface" : ""
                  }`}
                >
                  <Avatar label={label} src={thread.other_avatar} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{label}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {shortWhen(thread.last_at)}
                      </span>
                    </span>
                    <span
                      className={`block truncate text-xs ${
                        thread.unread_count > 0
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {thread.last_body
                        ? `${mine ? "You: " : ""}${thread.last_body}`
                        : thread.other_condition || "No messages yet"}
                    </span>
                  </span>
                  {thread.unread_count > 0 && (
                    <span
                      aria-label={`${thread.unread_count} unread`}
                      className="size-2.5 shrink-0 rounded-full bg-primary"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 bg-background">
      {listPane}

      {selection === null ? (
        <div className="hidden min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center md:flex">
          <span className="grid size-20 place-items-center rounded-full border-2 border-foreground">
            <MessageCircle className="size-9" aria-hidden="true" />
          </span>
          <h3 className="font-display text-2xl">Your messages</h3>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Send a private message to another family, or open a group you are part of. Nobody can
            write to you unless you opted into being contacted.
          </p>
          <Button size="sm" onClick={() => setComposing(true)}>
            Send message
          </Button>
        </div>
      ) : selection.kind === "circle" ? (
        <Thread
          kind="circle"
          id={selection.id}
          title={selection.circle.name}
          subtitle={`${selection.circle.member_count} member${
            selection.circle.member_count === 1 ? "" : "s"
          }`}
          avatar={null}
          viewerId={viewerId}
          onBack={() => setSelection(null)}
        />
      ) : (
        <Thread
          kind="private"
          id={selection.id}
          title={personLabel(selection.thread.other_name, selection.thread.other_id)}
          subtitle={selection.thread.other_condition}
          avatar={selection.thread.other_avatar}
          viewerId={viewerId}
          onBack={() => {
            openId.current = null;
            setSelection(null);
          }}
          request={
            selection.thread.state === "request"
              ? {
                  onAccept: () => answerRequest(selection.id, true),
                  onDecline: () => answerRequest(selection.id, false),
                }
              : null
          }
        />
      )}

      {composing && <NewMessage onClose={() => setComposing(false)} onPick={startWith} />}
    </div>
  );
}

/** One open conversation: group or one-to-one, both live. */
function Thread({
  kind,
  id,
  title,
  subtitle,
  avatar,
  viewerId,
  onBack,
  request = null,
}: {
  kind: "circle" | "private";
  id: string;
  title: string;
  subtitle: string | null;
  avatar: string | null;
  viewerId: string | null;
  onBack: () => void;
  request?: { onAccept: () => Promise<void>; onDecline: () => Promise<void> } | null;
}) {
  const { status, messages, error, send } = useLiveConversation(kind, id);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [answering, setAnswering] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, id]);

  React.useEffect(() => {
    setDraft("");
    setSendError(null);
  }, [id]);

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
      // The draft survives a failure: retyping a message because the network
      // blipped is its own small insult.
      setSendError(cause instanceof Error ? cause.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  async function answer(accept: boolean) {
    if (!request) return;
    setAnswering(true);
    try {
      await (accept ? request.onAccept() : request.onDecline());
    } finally {
      setAnswering(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-surface md:hidden"
        >
          <ArrowLeft className="size-5" />
          <span className="sr-only">Back to messages</span>
        </button>
        {kind === "circle" ? (
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-highlight/40 text-primary"
          >
            <Users className="size-5" />
          </span>
        ) : (
          <Avatar label={title} src={avatar} size="size-10" />
        )}
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg leading-tight">{title}</h3>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] uppercase text-muted-foreground">
          {status === "loading" ? (
            <>
              <Loader2 className="size-3 animate-spin" aria-hidden="true" /> loading
            </>
          ) : status === "live" ? (
            <>
              <span className="size-2 rounded-full bg-primary node-pulse" aria-hidden="true" />
              live
            </>
          ) : status === "unconfigured" ? (
            "offline"
          ) : (
            "error"
          )}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6" aria-live="polite">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && messages.length === 0 && status === "live" && (
          <p className="text-sm text-muted-foreground">
            No messages yet. Say hello — everyone here shares the same biology.
          </p>
        )}
        <ul className="mx-auto flex max-w-3xl flex-col gap-2">
          {messages.map((message, index) => {
            const mine = viewerId !== null && message.sender_id === viewerId;
            const previous = messages[index - 1];
            const startsRun = !previous || previous.sender_id !== message.sender_id;
            return (
              <li
                key={message.id}
                className={`flex ${mine ? "justify-end" : "justify-start"} ${
                  startsRun ? "mt-3 first:mt-0" : ""
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-3xl px-4 py-2 ${
                    mine ? "bg-primary text-primary-foreground" : "bg-surface"
                  }`}
                >
                  {!mine && kind === "circle" && startsRun && (
                    <p className="text-[10px] uppercase opacity-70">
                      member {shortId(message.sender_id)}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.body}
                  </p>
                  <time
                    className="mt-0.5 block text-[10px] opacity-60"
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

      {request ? (
        <div className="border-t border-border px-4 py-4 md:px-6">
          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {title} wants to send you messages. They cannot write again until you answer, and
            declining hides the thread without telling them.
          </p>
          <div className="mx-auto mt-3 flex max-w-3xl gap-2">
            <Button size="sm" disabled={answering} onClick={() => void answer(true)}>
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={answering}
              onClick={() => void answer(false)}
            >
              Decline
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="border-t border-border px-4 py-3 md:px-6">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <label className="sr-only" htmlFor={`composer-${id}`}>
              Message
            </label>
            <input
              id={`composer-${id}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message…"
              className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              type="submit"
              size="sm"
              className="rounded-full"
              disabled={sending || draft.trim().length === 0}
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
          {sendError && (
            <p className="mx-auto mt-2 max-w-3xl text-xs text-destructive">{sendError}</p>
          )}
        </form>
      )}
    </section>
  );
}

/** Search for someone to write to. Only people who opted in are findable. */
function NewMessage({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (person: PersonResult) => Promise<void>;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<PersonResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    // Debounced: a keystroke is not a query.
    const timer = window.setTimeout(() => {
      searchPeople(term)
        .then((people) => {
          setResults(people);
          setError(null);
        })
        .catch((cause: unknown) =>
          setError(cause instanceof Error ? cause.message : "Search is unavailable."),
        )
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function pick(person: PersonResult) {
    setBusyId(person.id);
    setError(null);
    try {
      await onPick(person);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That conversation could not be opened.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="New message"
    >
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-background shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="font-display text-xl">New message</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-surface"
          >
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or condition"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="Search people"
          />
          {searching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {error && <p className="px-3 py-2 text-sm text-destructive">{error}</p>}
          {!error && query.trim() === "" && (
            <p className="px-3 py-2 text-sm leading-relaxed text-muted-foreground">
              Type a name or a condition. Only people who turned on matching in their profile can be
              found here.
            </p>
          )}
          {!error && query.trim() !== "" && !searching && results.length === 0 && (
            <p className="px-3 py-2 text-sm leading-relaxed text-muted-foreground">
              Nobody matching that has opted into being contacted.
            </p>
          )}
          <ul>
            {results.map((person) => {
              const label = personLabel(person.display_name, person.id);
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void pick(person)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface disabled:opacity-60"
                  >
                    <Avatar label={label} src={person.avatar_url} size="size-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{label}</span>
                      {person.condition && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {person.condition}
                        </span>
                      )}
                    </span>
                    {busyId === person.id && (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
