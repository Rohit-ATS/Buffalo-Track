import * as React from "react";
import { BookOpen, ExternalLink, HelpCircle, Loader2, Microscope, Network } from "lucide-react";

import type { ConditionInsight, ConditionRef } from "@/lib/condition-insight";

/**
 * "Understand the condition" -- the symptom half of the learning tabs.
 *
 * Every number on this screen comes from `atlas_symptoms`, including the
 * frequency. Where the source recorded no frequency we say "frequency not
 * recorded" instead of drawing an empty bar that reads as zero, because a
 * family should never have to guess whether a blank means rare or unknown.
 */
export function LearnView({
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
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <BookOpen className="size-3.5" /> Understand the condition
        </span>
        <h2 className="font-display text-3xl leading-tight">
          What is known about {insight ? insight.condition.name : "your condition"}
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Signs reported in the medical literature, and the questions researchers have not answered
          yet. This is reference material for understanding your own notes and appointments — it is
          not a diagnosis and not medical advice.
        </p>
        <ConditionPicker
          conditions={conditions}
          selected={insight?.condition.id ?? null}
          onPick={onPickCondition}
        />
      </header>

      {loading && <Pending label="Reading the atlas…" />}

      {!loading && insight && (
        <>
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <Fact label="Gene" value={insight.condition.gene} />
              <Fact label="Biological pathway" value={insight.condition.pathway} />
              <Fact label="Signs recorded" value={String(insight.symptoms.length)} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-xl">
              <Microscope className="size-4 text-primary" /> Reported signs and symptoms
            </h3>
            {insight.symptoms.length === 0 ? (
              <Empty>No symptoms are recorded for this condition in the atlas yet.</Empty>
            ) : (
              <ul className="space-y-2.5">
                {insight.symptoms.map((s) => (
                  <li
                    key={s.symptom}
                    className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium capitalize">{s.symptom}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {s.frequency === null
                          ? "frequency not recorded"
                          : `reported in ~${Math.round(s.frequency * 100)}% of described cases`}
                      </span>
                    </div>
                    {s.frequency !== null && (
                      <div
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
                        role="img"
                        aria-label={`Reported in about ${Math.round(s.frequency * 100)} percent of described cases`}
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(2, Math.round(s.frequency * 100))}%` }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Frequencies describe published cohorts, not your child. Two families with the same
              variant can look very different.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-xl">
              <HelpCircle className="size-4 text-primary" /> Still unanswered
            </h3>
            {insight.openQuestions.length === 0 ? (
              <Empty>No open questions are recorded for this condition yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {insight.openQuestions.map((q) => (
                  <li
                    key={q}
                    className="flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              These are the gaps researchers name themselves. They are often what a natural-history
              study is trying to close.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-xl">
              <Network className="size-4 text-primary" /> Conditions that share the biology
            </h3>
            {insight.related.length === 0 ? (
              <Empty>No connections to other conditions are recorded yet.</Empty>
            ) : (
              <ul className="space-y-2.5">
                {insight.related.map((r, i) => (
                  <li
                    key={`${r.id}-${i}`}
                    className="rounded-xl border border-border bg-surface p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onPickCondition(r.id)}
                        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        {r.name}
                      </button>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        {r.gene}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        {r.tier}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {r.sentence}
                    </p>
                    {r.quote && (
                      <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 text-xs italic leading-relaxed text-muted-foreground">
                        “{r.quote}”
                      </blockquote>
                    )}
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Read the source <ExternalLink className="size-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Families living with these conditions often face the same daily questions. This is how
              the network suggests who to connect you with.
            </p>
          </section>
        </>
      )}

      {!loading && !insight && (
        <Empty>
          Pick a condition above to read what the atlas has recorded. If yours is not listed, the
          atlas has not covered it yet.
        </Empty>
      )}
    </div>
  );
}

export function ConditionPicker({
  conditions,
  selected,
  onPick,
}: {
  conditions: ConditionRef[];
  selected: string | null;
  onPick: (id: string) => void;
}) {
  const id = React.useId();
  if (conditions.length === 0) return null;

  return (
    <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold uppercase tracking-wider text-muted-foreground">Showing</span>
      <select
        id={id}
        value={selected ?? ""}
        onChange={(event) => onPick(event.target.value)}
        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring"
      >
        {selected === null && <option value="">Choose a condition…</option>}
        {conditions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Pending({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
      {label}
    </p>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-background px-4 py-5 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </span>
  );
}
