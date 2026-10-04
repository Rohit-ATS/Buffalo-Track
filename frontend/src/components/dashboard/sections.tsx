import { Loader2, ShieldAlert } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { CircleList, Conversation } from "@/components/social";
import { DirectMessages } from "@/components/social/DirectMessages";
import { joinCircle } from "@/lib/family-network";
import {
  decideJoin,
  loadCircles,
  loadReports,
  pendingJoins,
  shortId,
  type Circle,
  type MemberReport,
  type PendingJoin,
} from "@/lib/social";

/**
 * The sections a role can open, as components.
 *
 * Each one loads its own data and says plainly when there is nothing to show.
 * An empty section is a real answer here -- a family with no circle yet, a
 * steward with no queue -- and inventing filler would be the same mistake as
 * inventing evidence.
 */

function Panel({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-3xl leading-tight">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{blurb}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Loading() {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…
    </p>
  );
}

function Failed({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 rounded-[6px] border border-destructive/40 bg-surface p-4 text-sm text-destructive">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

/** Loads once on mount and exposes a refresh, with error and loading state. */
function useAsync<T>(load: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const run = React.useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this section.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  React.useEffect(() => {
    void run();
  }, [run]);

  return { data, error, loading, refresh: run };
}

// ---------------------------------------------------------------- groups
export function CirclesSection({ viewerId }: { viewerId: string | null }) {
  const { data, error, loading, refresh } = useAsync<Circle[]>(loadCircles);
  const [active, setActive] = React.useState<Circle | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function ask(circle: Circle) {
    setBusyId(circle.id);
    setNotice(null);
    try {
      await joinCircle(circle.id);
      setNotice("Request sent. A steward reviews it privately.");
      await refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "That request could not be sent.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel
      title="Groups"
      blurb="Private circles for families living with the same biology. A steward approves every join."
    >
      {loading && <Loading />}
      {error && <Failed message={error} />}
      {notice && <p className="mb-4 text-sm text-muted-foreground">{notice}</p>}

      {data && (
        <div className="grid gap-6">
          <CircleList
            circles={data}
            activeId={active?.id ?? null}
            onOpen={setActive}
            onJoin={ask}
            busyId={busyId}
          />
          {active && (
            <Conversation kind="circle" id={active.id} title={active.name} viewerId={viewerId} />
          )}
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- messages
/**
 * The inbox. The list of threads, the open conversation and the people search
 * all live in `DirectMessages`; this only gives it the full height of the
 * section so it reads as a messaging app rather than a widget on a page.
 */
export function MessagesSection({ viewerId }: { viewerId: string | null }) {
  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[30rem] flex-col overflow-hidden rounded-[6px] border border-border bg-background">
      <DirectMessages viewerId={viewerId} />
    </div>
  );
}

// ---------------------------------------------------------------- moderation
export function ModerationSection() {
  const joins = useAsync<PendingJoin[]>(pendingJoins);
  const reports = useAsync<MemberReport[]>(loadReports);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function decide(join: PendingJoin, decision: "active" | "blocked") {
    const key = `${join.circle_id}:${join.profile_id}`;
    setBusy(key);
    try {
      await decideJoin(join.circle_id, join.profile_id, decision);
      await joins.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel
      title="Moderation"
      blurb="Join requests and member reports for circles you steward. Members appear as short ids: their profiles are not yours to read."
    >
      <div className="grid gap-8">
        <div>
          <p className="eyebrow">Join requests</p>
          {joins.loading && <Loading />}
          {joins.error && <Failed message={joins.error} />}
          {joins.data?.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">Nothing waiting. Queue is clear.</p>
          )}
          <ul className="mt-2 grid gap-2">
            {(joins.data ?? []).map((join) => {
              const key = `${join.circle_id}:${join.profile_id}`;
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border p-3"
                >
                  <span className="text-sm">
                    member <strong>{shortId(join.profile_id)}</strong> → circle{" "}
                    <strong>{shortId(join.circle_id)}</strong>
                  </span>
                  <span className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy === key}
                      onClick={() => void decide(join, "active")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === key}
                      onClick={() => void decide(join, "blocked")}
                    >
                      Block
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="eyebrow">Reports</p>
          {reports.loading && <Loading />}
          {reports.error && <Failed message={reports.error} />}
          {reports.data?.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">No reports filed.</p>
          )}
          <ul className="mt-2 grid gap-2">
            {(reports.data ?? []).map((report) => (
              <li key={report.id} className="rounded-[6px] border border-border p-3">
                <p className="text-sm">{report.reason}</p>
                <p className="mt-1 text-[11px] uppercase text-muted-foreground">
                  reported {shortId(report.reported_id)} · by {shortId(report.reporter_id)} ·{" "}
                  {new Date(report.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
