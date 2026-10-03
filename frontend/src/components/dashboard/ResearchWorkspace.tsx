import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  FileText,
  Loader2,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";

import { diseases, diseaseById, edges, sources, coverage, type Edge } from "@/lib/atlas-data";
import {
  breakdown,
  mechanismUnits,
  nextSteps,
  passages,
  plainExplain,
  provenance,
  qualityMetrics,
  related,
  resolution,
  resolve,
  trials,
  whyNot,
} from "@/lib/atlas-workspace";
import { usePersona } from "@/lib/persona";
import { BriefDialog, TierBadge } from "@/components/atlas-ui";
import { Button } from "@/components/ui/button";
import { Squiggle } from "@/components/sketches";

type Tab = "search" | "mechanisms" | "related" | "evidence" | "trials" | "action" | "coverage";
const tabLabels: Record<Tab, string> = {
  search: "Search & resolve",
  mechanisms: "Mechanisms",
  related: "Related",
  evidence: "Evidence",
  trials: "Trials & assets",
  action: "Action",
  coverage: "Coverage",
};
const personaOrder: Record<string, Tab[]> = {
  maria: ["search", "trials", "action", "related", "evidence", "mechanisms", "coverage"],
  devon: ["search", "trials", "action", "related", "evidence", "mechanisms", "coverage"],
  priya: ["search", "mechanisms", "related", "evidence", "trials", "action", "coverage"],
  osei: ["search", "related", "evidence", "mechanisms", "action", "trials", "coverage"],
};

const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-[6px] border border-border bg-surface p-4 ${className}`}>{children}</div>
);
const Bar = ({ label, value }: { label: string; value: number }) => (
  <div className="text-[11px]">
    <div className="mb-1 flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <strong>{value}%</strong>
    </div>
    <div className="h-1.5 rounded-full bg-background">
      <div
        className="h-full rounded-full bg-primary transition-all duration-700"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);
const Empty = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[6px] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

export function ResearchWorkspace() {
  const { persona } = usePersona();
  const order = personaOrder[persona] ?? personaOrder["maria"]!;
  const [tab, setTab] = useState<Tab>("search");
  const [focus, setFocus] = useState("stxbp1");
  const d = diseaseById(focus)!;

  return (
    <section id="workspace" className="mt-8 lg:col-span-12">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Research workspace · sample data</p>
          <h2 className="font-display text-3xl">Work the evidence</h2>
        </div>
        <label className="flex items-center gap-2 text-xs">
          Focus disease
          <select
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs"
          >
            {diseases.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        role="tablist"
        className="mb-4 flex gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1"
      >
        {order.map((t) => (
          <Button
            key={t}
            role="tab"
            aria-selected={tab === t}
            size="sm"
            variant={tab === t ? "default" : "ghost"}
            className="shrink-0 rounded-full text-[11px]"
            onClick={() => setTab(t)}
          >
            {tabLabels[t]}
          </Button>
        ))}
      </div>
      <div key={tab + focus} className="dashboard-enter">
        {tab === "search" && <SearchResolve onPick={setFocus} />}
        {tab === "mechanisms" && <Mechanisms focus={focus} />}
        {tab === "related" && <Related focus={focus} onPick={setFocus} />}
        {tab === "evidence" && <EvidenceLab focus={focus} />}
        {tab === "trials" && <TrialsAssets focus={focus} />}
        {tab === "action" && <ActionPanel focus={focus} />}
        {tab === "coverage" && <CoveragePanel />}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Showing {d.name}. Research navigation, not medical advice.
      </p>
    </section>
  );
}

const EXAMPLES = [
  "Ohtahara",
  "Munc18",
  "febrile seizures",
  "MONDO:0007948",
  "SCN2A",
  "FamilieSCN2A",
];

function SearchResolve({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState("Ohtahara");
  const [shown, setShown] = useState("Ohtahara");
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setShown(q);
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);
  const res = useMemo(() => resolve(shown), [shown]);
  const commit = (v: string) => {
    setQ(v);
    setRecent((r) => [v, ...r.filter((x) => x !== v)].slice(0, 5));
  };
  const r = res ? resolution[res.d.id] : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <label className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit(q)}
            placeholder="Disease, gene, synonym, symptom, mechanism, group or MONDO ID"
            className="w-full bg-transparent text-sm outline-none"
            aria-label="Search the atlas"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </label>
        <p className="mt-3 text-[11px] font-semibold uppercase text-muted-foreground">Try</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {EXAMPLES.map((x) => (
            <button
              key={x}
              onClick={() => commit(x)}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-background"
            >
              {x}
            </button>
          ))}
        </div>
        {recent.length > 0 && (
          <>
            <p className="mt-3 text-[11px] font-semibold uppercase text-muted-foreground">Recent</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {recent.map((x) => (
                <button key={x} onClick={() => setQ(x)} className="text-[11px] underline">
                  {x}
                </button>
              ))}
            </div>
          </>
        )}
      </Card>
      <Card>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-background"
                style={{ width: `${90 - i * 20}%` }}
              />
            ))}
          </div>
        ) : !res ? (
          <Empty>
            No match for “{shown}”. Try a gene (STXBP1), a symptom (epilepsy) or a synonym (DEE4).
            We only cover 10 sample diseases right now.
          </Empty>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">
              You searched “<strong className="text-foreground">{shown}</strong>”. Matched{" "}
              <mark className="rounded bg-highlight/30 px-1 text-foreground">{res.matched}</mark>,
              showing
            </p>
            <h3 className="mt-1 font-display text-2xl">{res.d.name}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <dt className="text-muted-foreground">MONDO ID</dt>
              <dd className="font-mono">{r?.mondo}</dd>
              <dt className="text-muted-foreground">Gene</dt>
              <dd>
                {res.d.gene} · {res.d.mechanism}
              </dd>
              <dt className="text-muted-foreground">Cross references</dt>
              <dd>
                OMIM {r?.omim} · {r?.orphanet} · {r?.gard}
              </dd>
              <dt className="text-muted-foreground">Alternative names</dt>
              <dd>{[...res.d.synonyms, ...(r?.extraSynonyms ?? [])].join(", ")}</dd>
              <dt className="text-muted-foreground">Phenotypes</dt>
              <dd>{r?.phenotypes.join(", ")}</dd>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onPick(res.d.id)}>
                Focus workspace here
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/disease/$id" params={{ id: res.d.id }}>
                  Open full journey
                </Link>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Mechanisms({ focus }: { focus: string }) {
  const d = diseaseById(focus)!;
  const units = mechanismUnits();
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {units.map((u) => {
        const mine = u.gene === d.gene && u.effect === d.mechanism;
        const sibling = u.gene === d.gene && !mine;
        return (
          <Card key={u.gene + u.effect} className={mine ? "border-primary" : ""}>
            <div className="flex items-center justify-between">
              <strong className="font-mono text-sm">
                {u.gene} + {u.effect === "loss-of-function" ? "LoF" : "GoF"}
              </strong>
              {mine && (
                <span className="text-[10px] font-semibold uppercase text-primary">Focus</span>
              )}
              {sibling && (
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-risk">
                  <AlertTriangle className="size-3" />
                  Kept separate
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] capitalize text-muted-foreground">{u.effect}</p>
            <dl className="mt-3 space-y-1 text-xs">
              <div>
                <dt className="inline text-muted-foreground">Pathway: </dt>
                <dd className="inline">{u.pathway}</dd>
              </div>
              <div>
                <dt className="inline text-muted-foreground">Process: </dt>
                <dd className="inline">{u.process}</dd>
              </div>
              <div>
                <dt className="inline text-muted-foreground">Phenotypes: </dt>
                <dd className="inline">{u.phenotypes.join(", ")}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-1">
              {u.diseases.map((id) => (
                <Link
                  key={id}
                  to="/disease/$id"
                  params={{ id }}
                  className="rounded-full bg-background px-2 py-0.5 text-[10px] hover:underline"
                >
                  {diseaseById(id)!.name}
                </Link>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Related({ focus, onPick }: { focus: string; onPick: (id: string) => void }) {
  const list = related(focus);
  const [open, setOpen] = useState<string | null>(list[0]?.d.id ?? null);
  return (
    <div className="space-y-2">
      {list.map(({ d, overall, mechanism, pathway, phenotype, gene, sharedPh, geneRel }) => {
        const isOpen = open === d.id;
        const reasons = whyNot(focus, d.id);
        return (
          <Card key={d.id}>
            <button
              className="flex w-full items-center gap-4 text-left"
              onClick={() => setOpen(isOpen ? null : d.id)}
              aria-expanded={isOpen}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-primary font-display text-lg">
                {overall}
              </span>
              <span className="flex-1">
                <strong className="text-sm">{d.name}</strong>
                <span className="block text-[11px] text-muted-foreground">
                  {overall}% related · {geneRel}
                  {sharedPh.length ? ` · shares ${sharedPh.join(", ")}` : ""}
                </span>
              </span>
            </button>
            {isOpen && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Bar label="Mechanism" value={mechanism} />
                  <Bar label="Pathway" value={pathway} />
                  <Bar label="Phenotype" value={phenotype} />
                  <Bar label="Gene relationship" value={gene} />
                  <p className="text-[10px] text-muted-foreground">
                    Overall = 35% mechanism + 25% pathway + 25% phenotype + 15% gene.
                  </p>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="size-3.5 text-primary" />
                      Why connected
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {pathway > 50 ? `Both sit in ${d.pathway.toLowerCase()}. ` : ""}
                      {sharedPh.length ? `Shared symptoms: ${sharedPh.join(", ")}. ` : ""}
                      {geneRel}.
                    </p>
                  </div>
                  {reasons.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1 font-semibold">
                        <XCircle className="size-3.5 text-risk" />
                        Why not (fully) connected
                      </p>
                      <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                        {reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onPick(d.id)}>
                    Focus on {d.gene}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function EvidenceLab({ focus }: { focus: string }) {
  const list = edges.filter((e) => e.from === focus || e.to === focus);
  const [sel, setSel] = useState<Edge | null>(list[0] ?? null);
  const [explain, setExplain] = useState(false);
  useEffect(() => setExplain(false), [sel]);
  if (!list.length)
    return (
      <Empty>
        No sourced connections for this disease yet. That gap is itself a finding: consider a case
        series.
      </Empty>
    );
  const p = sel ? passages[sel.id] : undefined;
  const prov = sel ? provenance(sel) : undefined;
  return (
    <div className="grid gap-4 lg:grid-cols-[.9fr_1.4fr]">
      <div className="space-y-2">
        {list.map((e) => (
          <button
            key={e.id}
            onClick={() => setSel(e)}
            className={`w-full rounded-[6px] border p-3 text-left text-xs transition ${sel?.id === e.id ? "border-primary bg-surface" : "border-border bg-surface/60 hover:bg-surface"}`}
          >
            <div className="flex items-center justify-between">
              <strong>
                {diseaseById(e.from)!.gene} ↔ {diseaseById(e.to)!.gene}
              </strong>
              <TierBadge tier={e.tier} />
            </div>
            <p className="mt-1 text-muted-foreground">{e.sentence}</p>
          </button>
        ))}
      </div>
      {sel && p && prov && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">
              {diseaseById(sel.from)!.gene} ↔ {diseaseById(sel.to)!.gene}
            </h3>
            <div className="text-right text-xs">
              <span>
                Confidence <strong>{Math.round(sel.confidence * 100)}%</strong>
              </span>
              <span
                className={`ml-2 font-semibold ${sel.clinicalProof ? "text-primary" : "text-muted-foreground"}`}
              >
                {sel.clinicalProof ? "Clinical proof" : "No clinical proof"}
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${sel.confidence * 100}%` }}
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Quote verifier
            </p>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <blockquote className="rounded border border-border p-2 text-xs italic">
                {sel.quote ?? "No exact quote stored."}
              </blockquote>
              <blockquote className="rounded border border-border bg-background p-2 text-xs">
                {p.passage}
              </blockquote>
            </div>
            <p
              className={`mt-1 flex items-center gap-1 text-xs font-semibold ${p.result === "Verified" ? "text-primary" : p.result === "Paraphrased" ? "text-highlight" : "text-risk"}`}
            >
              {p.result === "Verified" ? (
                <CheckCircle2 className="size-3.5" />
              ) : p.result === "Paraphrased" ? (
                <CircleHelp className="size-3.5" />
              ) : (
                <XCircle className="size-3.5" />
              )}
              {p.result}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="rounded border border-border p-2">
              <p className="font-semibold text-primary">Supporting</p>
              <p className="mt-1 text-muted-foreground">{sel.rule}</p>
            </div>
            <div className="rounded border border-border p-2">
              <p className="font-semibold text-risk">Contradicting</p>
              <p className="mt-1 text-muted-foreground">
                {sel.contradicting ?? "None found in current sources."}
              </p>
            </div>
          </div>
          <div>
            <Button size="sm" variant="outline" onClick={() => setExplain((v) => !v)}>
              <Sparkles className="size-3.5" />
              Explain simply
            </Button>
            {explain && (
              <p className="mt-2 rounded bg-background p-3 text-xs">
                {plainExplain(sel)}{" "}
                <span className="block pt-1 text-[10px] text-muted-foreground">
                  Plain-language summary generated from the stored evidence only.
                </span>
              </p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-1 border-t border-border pt-3 text-[11px]">
            <dt className="text-muted-foreground">Source</dt>
            <dd>{prov.source}</dd>
            <dt className="text-muted-foreground">Retrieved</dt>
            <dd>{prov.retrieved}</dd>
            <dt className="text-muted-foreground">Method</dt>
            <dd>{sel.method}</dd>
            <dt className="text-muted-foreground">Version</dt>
            <dd>{prov.version}</dd>
          </dl>
        </Card>
      )}
    </div>
  );
}

function TrialsAssets({ focus }: { focus: string }) {
  const [kind, setKind] = useState("all");
  const t = trials.filter((x) => x.diseaseId === focus);
  const pool = [
    diseaseById(focus)!,
    ...related(focus)
      .slice(0, 3)
      .map((r) => r.d),
  ];
  const assets = pool
    .flatMap((d) => d.assets.map((a) => ({ ...a, disease: d.name })))
    .filter((a) => kind === "all" || a.kind === kind);
  const orgs = [...new Set(pool.map((d) => d.patientGroup).filter(Boolean))] as string[];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <p className="eyebrow">Clinical studies</p>
        {t.length ? (
          <div className="mt-2 divide-y divide-border">
            {t.map((x) => (
              <div key={x.id} className="grid gap-1 py-2 text-xs sm:grid-cols-[1.6fr_.6fr_.6fr]">
                <div>
                  <strong>{x.title}</strong>
                  <p className="text-muted-foreground">
                    {x.eligibility} · {x.sites} sites · <span className="font-mono">{x.id}</span>
                  </p>
                </div>
                <span>{x.phase}</span>
                <span
                  className={
                    x.status === "Recruiting"
                      ? "font-semibold text-primary"
                      : "text-muted-foreground"
                  }
                >
                  {x.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>
            No studies listed for this disease. Related studies below may accept participants with
            similar biology.
          </Empty>
        )}
        <div className="mt-4 flex items-center justify-between">
          <p className="eyebrow">Research assets (incl. related diseases)</p>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-full border border-border bg-background px-2 py-1 text-[11px]"
          >
            <option value="all">All</option>
            <option value="registry">Registries</option>
            <option value="natural history study">Natural history</option>
            <option value="model">Models</option>
            <option value="trial">Trials</option>
          </select>
        </div>
        {assets.length ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {assets.map((a) => (
              <li key={a.name + a.disease} className="rounded border border-border p-2 text-xs">
                <strong>{a.name}</strong>
                <p className="text-muted-foreground capitalize">
                  {a.kind} · {a.owner}
                </p>
                <p className="text-[10px] text-muted-foreground">From {a.disease}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No assets of this type.</Empty>
        )}
      </Card>
      <Card>
        <p className="eyebrow">Patient organizations</p>
        {orgs.length ? (
          <ul className="mt-2 space-y-2 text-sm">
            {orgs.map((o) => (
              <li key={o} className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" />
                {o}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No groups yet.</Empty>
        )}
        <Squiggle className="mt-6 w-32 text-primary" />
      </Card>
    </div>
  );
}

function ActionPanel({ focus }: { focus: string }) {
  const d = diseaseById(focus)!;
  const [brief, setBrief] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const steps = nextSteps(focus);
  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Next-step recommendations</p>
          <h3 className="font-display text-2xl">What to do for {d.gene}</h3>
        </div>
        <Button onClick={() => setBrief(true)}>
          <FileText className="size-4" />
          Generate collaboration brief
        </Button>
      </div>
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => {
          const isDone = done.includes(s.action);
          return (
            <li
              key={s.action}
              className={`grid gap-2 rounded border border-border p-3 text-xs sm:grid-cols-[auto_1fr_auto_auto] sm:items-center ${isDone ? "opacity-60" : ""}`}
            >
              <span className="grid size-7 place-items-center rounded-full bg-background font-display">
                {i + 1}
              </span>
              <div>
                <strong className={isDone ? "line-through" : ""}>{s.action}</strong>
                <p className="text-muted-foreground">
                  {s.who} · {s.why}
                </p>
              </div>
              <span className="w-fit rounded-full border border-border px-2 py-0.5 text-[10px]">
                Effort: {s.effort}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setDone((x) => (isDone ? x.filter((y) => y !== s.action) : [...x, s.action]))
                }
              >
                {isDone ? "Undo" : "Mark done"}
              </Button>
            </li>
          );
        })}
      </ol>
      <BriefDialog disease={d} open={brief} onOpenChange={setBrief} />
    </Card>
  );
}

function CoveragePanel() {
  const q = qualityMetrics();
  const total = edges.length;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <p className="eyebrow">Coverage</p>
        <p className="mt-2 font-display text-4xl">{coverage.diseases}</p>
        <p className="text-xs text-muted-foreground">
          diseases · {coverage.connections} sourced connections · updated {coverage.updated}
        </p>
        <p className="mt-3 text-xs">
          {diseases.filter((d) => d.noRoute).length} known gap (no route yet)
        </p>
      </Card>
      <Card>
        <p className="eyebrow">Quality</p>
        <div className="mt-3 space-y-2">
          <Bar label="Quotes verified exactly" value={q.verifiedPct} />
          <Bar label="Observed" value={Math.round((q.tiers.observed / total) * 100)} />
          <Bar label="Reported" value={Math.round((q.tiers.reported / total) * 100)} />
          <Bar label="Inferred" value={Math.round((q.tiers.inferred / total) * 100)} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {q.contradicting} connection(s) carry contradicting evidence.
        </p>
      </Card>
      <Card>
        <p className="eyebrow">Data provenance</p>
        <ul className="mt-2 space-y-1 text-xs">
          {sources.map((s) => (
            <li key={s.id} className="flex justify-between">
              <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">
                {s.name}
              </a>
              <span className="text-muted-foreground">
                {s.count} · {s.pulled}
              </span>
            </li>
          ))}
        </ul>
        <Link to="/methods" className="mt-3 block text-xs font-semibold underline">
          How we score evidence
        </Link>
      </Card>
    </div>
  );
}

export { breakdown };
