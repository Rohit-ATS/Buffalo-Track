import { AlertTriangle, Database, Radio } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The three honest answers to "is this real": the live, RLS-scoped atlas
 * responded; the live atlas could not be reached, so this is the bundled
 * curated snapshot; or the live atlas was reachable and still came back
 * curated-only (nothing in this build calls that "unavailable" — reserve it
 * for an actual failure, not a smaller coverage).
 *
 * This is the one place that may say "live" or "curated" in the UI. Every
 * screen in PHASE 1 item 5's list renders through this component instead of
 * writing its own badge, so the wording can never drift between pages.
 */
export type AtlasDataState = "live" | "curated" | "unavailable";

const COPY: Record<AtlasDataState, { label: string; tone: string; icon: typeof Radio }> = {
  live: {
    label: "Live verified atlas",
    tone: "border-primary/40 bg-primary/10 text-primary",
    icon: Radio,
  },
  curated: {
    label: "Curated snapshot",
    tone: "border-border bg-surface text-muted-foreground",
    icon: Database,
  },
  unavailable: {
    label: "Live atlas temporarily unavailable",
    tone: "border-risk/40 bg-risk/10 text-risk",
    icon: AlertTriangle,
  },
};

export function DataStateBadge({
  state,
  detail,
  className = "",
}: {
  state: AtlasDataState;
  /** e.g. "18 conditions, updated Oct 3" or the live error message. Optional. */
  detail?: string | undefined;
  className?: string;
}) {
  const { label, tone, icon: Icon } = COPY[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone} ${className}`}
      role="status"
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
      {detail && <span className="font-normal normal-case opacity-80">· {detail}</span>}
    </span>
  );
}

/**
 * Wraps a result block with the badge plus a link to /methods, so every
 * decision-driving screen explains itself the same way instead of each page
 * inventing its own disclosure sentence.
 */
export function DataStateBar({
  state,
  detail,
  children,
}: {
  state: AtlasDataState;
  detail?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <DataStateBadge state={state} detail={detail} />
      {children}
      <a
        href={`${import.meta.env.BASE_URL}methods`}
        className="text-[11px] font-semibold uppercase text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        Coverage &amp; methods
      </a>
    </div>
  );
}
