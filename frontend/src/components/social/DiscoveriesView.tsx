import {
  Building2,
  CalendarClock,
  ExternalLink,
  FlaskConical,
  Radar,
  UserRound,
} from "lucide-react";

import { Empty, ConditionPicker, Pending } from "@/components/social/LearnView";
import {
  isOpenTrial,
  trialStatusLabel,
  type ConditionInsight,
  type ConditionRef,
  type TrialFact,
} from "@/lib/condition-insight";

/**
 * "What is being found out" -- the research half of the learning tabs.
 *
 * Studies come from `atlas_trials`, which is loaded from ClinicalTrials.gov, so
 * every card here is a registry record with an NCT number a family can take to
 * their neurologist. Open studies are listed first and separately, because the
 * difference between "you could join this" and "this finished in 2016" is the
 * whole point of the screen.
 */
export function DiscoveriesView({
  insight,
  conditions,
  loading,
  onPickCondition,
}: {
  insight: ConditionInsight | null;
  conditions: ConditionRef[];
  loading: boolean;
  onPickCondition: (id: string) => void;
}) {
  const open = insight?.trials.filter((t) => isOpenTrial(t.status)) ?? [];
  const closed = insight?.trials.filter((t) => !isOpenTrial(t.status)) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Radar className="size-3.5" /> Upcoming discoveries
        </span>
        <h2 className="font-display text-3xl leading-tight">
          Research on {insight ? insight.condition.name : "your condition"}
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Studies registered on ClinicalTrials.gov, newest first, with the ones still accepting
          participants at the top. Atlas does not run these studies and cannot enrol you — talk to
          your clinician before contacting a site.
        </p>
        <ConditionPicker
          conditions={conditions}
          selected={insight?.condition.id ?? null}
          onPick={onPickCondition}
        />
      </header>

      {loading && <Pending label="Checking the study registry…" />}

      {!loading && insight && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Stat label="Still open" value={open.length} highlight />
            <Stat label="Closed or completed" value={closed.length} />
            <Stat label="Open questions" value={insight.openQuestions.length} />
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-xl">
              <FlaskConical className="size-4 text-primary" /> Open to participants
            </h3>
            {open.length === 0 ? (
              <Empty>
                No study for this condition is currently recruiting in the registry. That can change
                — this list is read fresh each time you open it.
              </Empty>
            ) : (
              <ul className="space-y-3">
                {open.map((t) => (
                  <TrialCard key={t.id} trial={t} open />
                ))}
              </ul>
            )}
          </section>

          {closed.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 font-display text-xl text-muted-foreground">
                <CalendarClock className="size-4" /> Closed, completed, or withdrawn
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Kept visible because a finished study is often where the next one starts, and
                because its published results may already answer a question you have.
              </p>
              <ul className="space-y-3">
                {closed.map((t) => (
                  <TrialCard key={t.id} trial={t} open={false} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {!loading && !insight && (
        <Empty>Pick a condition above to see the studies registered for it.</Empty>
      )}
    </div>
  );
}

function TrialCard({ trial, open }: { trial: TrialFact; open: boolean }) {
  return (
    <li
      className={`rounded-2xl border bg-surface p-4 shadow-sm ${
        open ? "border-primary/40" : "border-border opacity-90"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            open ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {trialStatusLabel(trial.status)}
        </span>
        {trial.studyType && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {trialStatusLabel(trial.studyType)}
          </span>
        )}
        {trial.nctId && (
          <span className="font-mono text-[11px] text-muted-foreground">{trial.nctId}</span>
        )}
      </div>

      <h4 className="mt-2 text-sm font-semibold leading-snug">{trial.name}</h4>

      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        {trial.sponsor && (
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-3.5 shrink-0" /> {trial.sponsor}
          </span>
        )}
        {trial.investigator && (
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-3.5 shrink-0" /> {trial.investigator}
          </span>
        )}
        {trial.startDate && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5 shrink-0" /> Started {trial.startDate}
          </span>
        )}
      </div>

      {trial.url && (
        <a
          href={trial.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Open the registry record <ExternalLink className="size-3" />
        </a>
      )}
    </li>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-surface"
      }`}
    >
      <p className="font-display text-3xl leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
