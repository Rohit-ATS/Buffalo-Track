import { createFileRoute, Link } from "@tanstack/react-router";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AccountMenu } from "@/components/AccountMenu";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  FlaskConical,
  GitCompareArrows,
  LayoutDashboard,
  Network,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Constellation, Neuron, PaperPlane, ScribbleCircle, Sparkle, Squiggle } from "@/components/sketches";
import { Button } from "@/components/ui/button";
import { ResearchWorkspace } from "@/components/dashboard/ResearchWorkspace";

export const Route = createFileRoute("/dashboard")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Research Dashboard — Rare Disease Atlas" },
      { name: "description", content: "Review mapped conditions, evidence coverage, biological neighbors, and active rare-disease collaboration briefs." },
      { property: "og:title", content: "Research Dashboard — Rare Disease Atlas" },
      { property: "og:description", content: "A research workspace for evidence receipts, biological connections, and shared action." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/dashboard" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/dashboard" }],
  }),
  component: DashboardPage,
});

const weeks = [
  { label: "18–24 May", values: [42, 66, 48, 80, 58, 72, 86], receipts: 18 },
  { label: "25–31 May", values: [58, 72, 65, 88, 76, 92, 83], receipts: 24 },
  { label: "1–7 Jun", values: [48, 62, 78, 70, 91, 84, 96], receipts: 29 },
] as const;

const evidence = {
  All: [
    ["STX1B ↔ STXBP1", "Observed", "Shared presynaptic vesicle-fusion biology", "12 min"],
    ["SNARE gene disorders", "Reported", "Community assets mapped to a shared mechanism", "2 hr"],
    ["Candidate cohort 04", "Inferred", "Potential natural-history study reuse", "Yesterday"],
  ],
  Observed: [["STX1B ↔ STXBP1", "Observed", "Shared presynaptic vesicle-fusion biology", "12 min"]],
  Reported: [["SNARE gene disorders", "Reported", "Community assets mapped to a shared mechanism", "2 hr"]],
  Inferred: [["Candidate cohort 04", "Inferred", "Potential natural-history study reuse", "Yesterday"]],
} as const;

type EvidenceFilter = keyof typeof evidence;

function AtlasMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 32" fill="none" aria-hidden="true">
      <path d="M5 18c7-9 12-12 18-6 5 5 8 4 16-5M6 23c5-5 10-6 15-1 5 4 10 3 17-3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="6" cy="18" r="3.5" fill="currentColor" /><circle cx="38" cy="7" r="3.5" fill="currentColor" /><circle cx="38" cy="19" r="3.5" fill="currentColor" />
    </svg>
  );
}

function MetricCard({ icon: Icon, label, value, note, tone = "bg-surface" }: { icon: typeof Network; label: string; value: string; note: string; tone?: string }) {
  return (
    <article className={`dashboard-card min-h-40 ${tone}`}>
      <div className="flex items-start justify-between"><span className="dashboard-icon"><Icon className="size-4" /></span><span className="text-[10px] font-semibold uppercase text-muted-foreground">Live</span></div>
      <p className="mt-5 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-4xl leading-none">{value}</p>
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{note}</p>
    </article>
  );
}

function DashboardPage() {
  const [weekIndex, setWeekIndex] = useState(1);
  const [filter, setFilter] = useState<EvidenceFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState(5);
  const currentWeek = weeks[weekIndex] ?? weeks[0];
  const filteredEvidence = useMemo(() => evidence[filter], [filter]);

  return (
    <main className="min-h-screen bg-secondary p-2 text-foreground md:p-4">
      <div className="dashboard-shell mx-auto min-h-[calc(100vh-1rem)] max-w-[1540px] overflow-hidden bg-background md:min-h-[calc(100vh-2rem)]">
        <header className="border-b border-border px-4 py-3 md:px-7">
          <div className="flex items-center justify-between gap-5">
            <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg" aria-label="Rare Disease Atlas home"><AtlasMark className="w-9 text-primary" /><span className="hidden sm:inline">Rare Disease Atlas</span></Link>
            <nav className="dashboard-nav" aria-label="Workspace navigation">
              <Link to="/dashboard" activeProps={{ className: "is-active" }}><LayoutDashboard className="size-4" /> Overview</Link>
              <Link to="/stxbp1-disorder"><FlaskConical className="size-4" /> Research</Link>
              <Link to="/compare"><GitCompareArrows className="size-4" /> Compare</Link>
              <Link to="/mechanisms"><Network className="size-4" /> Mechanisms</Link>
              <Link to="/researchers"><Users className="size-4" /> Researchers</Link>
              <Link to="/methods"><BookOpen className="size-4" /> Methods</Link>
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationsBell />
              <div className="hidden text-right md:block"><p className="text-xs font-semibold">Research workspace</p><p className="text-[10px] text-muted-foreground">Demo atlas</p></div>
              <AccountMenu />
            </div>
          </div>
        </header>

        <section className="px-4 pb-5 pt-7 md:px-7 md:pb-7 md:pt-9">
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="relative">
              <p className="eyebrow">Research command center</p>
              <h1 className="mt-1 font-display text-4xl md:text-5xl">Good morning, explorer.</h1>
              <span className="ml-1 mt-1 hidden -rotate-2 font-sketch text-lg text-primary md:inline-block">follow the evidence ↘</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form className="flex h-10 min-w-64 items-center rounded-full border border-border bg-surface px-4" onSubmit={(event) => event.preventDefault()}>
                <Search className="mr-2 size-4 text-muted-foreground" /><label htmlFor="dashboard-search" className="sr-only">Search dashboard</label><input id="dashboard-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the workspace" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
              </form>
              <Button asChild><Link to="/" hash="search">New atlas search <ArrowRight className="size-4" /></Link></Button>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="grid grid-cols-2 gap-3 lg:col-span-3">
              <MetricCard icon={Network} label="Mapped conditions" value="24" note="Neurodevelopmental seed genes" />
              <MetricCard icon={CircleDot} label="Evidence coverage" value="82%" note="Receipts reviewed in this slice" tone="bg-example-mint" />
              <MetricCard icon={FileText} label="Active briefs" value="06" note="Two ready for expert review" tone="bg-example-yellow" />
              <MetricCard icon={Users} label="Communities" value="11" note="Across shared biological paths" />
            </div>

            <article className="dashboard-card bg-accent lg:col-span-5">
              <div className="flex items-center justify-between gap-4">
                <div><p className="eyebrow text-accent-foreground/65">Evidence activity</p><h2 className="mt-1 font-display text-2xl">{currentWeek.receipts} receipts reviewed</h2></div>
                <div className="flex items-center rounded-full border border-accent-foreground/15 bg-background/40 p-1">
                  <Button variant="ghost" size="icon" onClick={() => setWeekIndex((weekIndex + weeks.length - 1) % weeks.length)} aria-label="Previous week" className="rounded-full"><ChevronLeft className="size-4" /></Button>
                  <span className="min-w-24 text-center text-[11px] font-semibold">{currentWeek.label}</span>
                  <Button variant="ghost" size="icon" onClick={() => setWeekIndex((weekIndex + 1) % weeks.length)} aria-label="Next week" className="rounded-full"><ChevronRight className="size-4" /></Button>
                </div>
              </div>
              <div className="mt-8 grid h-48 grid-cols-7 items-end gap-3" aria-label="Evidence activity by day">
                {currentWeek.values.map((value, index) => (
                  <button key={`${currentWeek.label}-${index}`} type="button" onClick={() => setSelectedDay(index)} className="group flex h-full flex-col items-center justify-end gap-2" aria-label={`${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index]}: ${value} percent activity`}>
                    <span className={`text-[10px] font-semibold transition-opacity ${selectedDay === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>{value}%</span>
                    <span className="relative block h-36 w-full max-w-8 overflow-hidden rounded-full bg-background/65"><span className={`absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-500 ${selectedDay === index ? "bg-foreground" : "bg-primary"}`} style={{ height: `${value}%` }} /></span>
                    <span className="text-[10px]">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index]}</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="dashboard-card relative overflow-hidden lg:col-span-4">
              <Sparkle className="absolute right-5 top-5 w-8 text-highlight spin-slow" />
              <p className="eyebrow">This week’s path</p><h2 className="mt-1 font-display text-2xl">STX1B → STXBP1</h2>
              <div className="relative mt-5 grid grid-cols-7 items-center">
                {["Dx", "Gene", "Mechanism", "Neighbor", "Group", "Asset", "Action"].map((item, index) => <div key={item} className="relative z-10 flex flex-col items-center gap-2 text-center"><span className={`grid size-8 place-items-center rounded-full border text-[10px] font-semibold ${index <= 5 ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-foreground bg-background"}`}>{index < 6 ? <Check className="size-3" /> : "06"}</span><span className="text-[9px] text-muted-foreground">{item}</span></div>)}
                <div className="absolute left-[7%] right-[7%] top-4 border-t border-primary" />
              </div>
              <div className="mt-7 flex items-center justify-between border-t border-border pt-4"><div><p className="text-xs font-semibold">Natural-history brief</p><p className="text-[10px] text-muted-foreground">Ready for expert review</p></div><Button size="sm">Open brief <ArrowRight className="size-3.5" /></Button></div>
            </article>

            <article className="dashboard-card bg-contrast text-contrast-foreground lg:col-span-4">
              <div className="flex items-start justify-between"><div><p className="eyebrow text-contrast-muted">Biological neighborhood</p><h2 className="mt-1 font-display text-2xl">Presynaptic network</h2></div><Network className="size-5 text-primary" /></div>
              <div className="relative mt-4 h-52 overflow-hidden rounded-lg border border-contrast-muted/20 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_65%)]">
                <svg viewBox="0 0 300 200" className="absolute inset-0 h-full w-full text-primary" fill="none" stroke="currentColor" strokeLinecap="round">
                  <circle cx="150" cy="100" r="62" strokeWidth="0.8" strokeDasharray="2 5" opacity="0.5" className="spin-slow" style={{ transformOrigin: "150px 100px" }} />
                  <path d="M150 100 C 110 110, 85 130, 55 140" strokeWidth="2" pathLength={1} className="sketch-draw" />
                  <path d="M150 100 C 190 85, 215 70, 248 58" strokeWidth="1.6" strokeDasharray="6 4" />
                  <path d="M150 100 C 160 70, 140 45, 150 28" strokeWidth="1" strokeDasharray="2 4" opacity="0.7" />
                  <path d="M55 140 Q 150 190 248 58" strokeWidth="0.8" opacity="0.3" />
                </svg>
                <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
                  <span className="node-pulse block rounded-full border-2 border-primary bg-contrast px-3 py-1.5 font-display text-sm shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_55%,transparent)]">STXBP1</span>
                </div>
                <span className="absolute bottom-[18%] left-[6%] rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">STX1B</span>
                <span className="absolute right-[5%] top-[18%] rounded-full border border-primary/70 bg-contrast px-2.5 py-1 text-[10px] font-semibold">SNAP25</span>
                <span className="absolute left-1/2 top-[4%] -translate-x-1/2 rounded-full border border-dashed border-contrast-muted/60 px-2 py-0.5 text-[9px] text-contrast-muted">cohort 04</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-contrast-muted">
                <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-primary" />Observed</span>
                <span className="flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-dashed border-primary" />Reported</span>
                <span className="flex items-center gap-1.5"><i className="h-0 w-5 border-t border-dotted border-primary" />Inferred</span>
              </div>
              <p className="mt-3 font-sketch text-lg text-primary">shared machinery, distinct effects →</p>
            </article>

            <article className="dashboard-card lg:col-span-4">
              <div className="flex items-center justify-between"><div><p className="eyebrow">Evidence mix</p><h2 className="mt-1 font-display text-2xl">Receipt confidence</h2></div><span className="relative font-display text-4xl">82<ScribbleCircle className="absolute -inset-3 h-[140%] w-[160%] text-primary" /></span></div>
              <div className="mt-7 space-y-5">
                {[["Observed", 68, "bg-primary"], ["Reported", 22, "bg-highlight"], ["Inferred", 10, "bg-muted-foreground"]].map(([label, value, tone]) => <div key={label as string}><div className="mb-2 flex justify-between text-xs"><span>{label}</span><span className="font-semibold">{value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} /></div></div>)}
              </div>
              <div className="mt-6 space-y-2.5 border-t border-border pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Today’s checks</p>
                {[["STX1B cohort measures re-verified", true], ["SNAP25 edge awaiting second source", false], ["Cohort 04 flagged for expert review", false]].map(([item, done]) => (
                  <p key={item as string} className="flex items-center gap-2 text-[11px]"><span className={`grid size-4 shrink-0 place-items-center rounded-full border ${done ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-muted-foreground/50"}`}>{done ? <Check className="size-2.5" /> : null}</span><span className={done ? "text-muted-foreground line-through" : ""}>{item}</span></p>
                ))}
              </div>
              <p className="mt-5 flex items-center gap-2 font-sketch text-lg text-primary"><PaperPlane className="w-8" /> every receipt has a source →</p>
            </article>

            <aside className="dashboard-card relative overflow-hidden bg-example-mint lg:col-span-4">
              <Neuron className="absolute -bottom-5 -right-8 w-40 text-primary/20" />
              <p className="eyebrow">Next best action</p><h2 className="mt-2 max-w-xs font-display text-3xl leading-tight">Invite a mechanism expert to review the brief.</h2><p className="mt-3 max-w-sm text-xs leading-relaxed text-muted-foreground">Confirm whether the shared measures serve the STX1B cohort before outreach.</p>
              <div className="mt-6 space-y-2">
                {[["Draft the invitation", "today"], ["Attach the evidence receipts", "today"], ["Expert review window", "3 days"]].map(([step, when], index) => (
                  <div key={step} className="flex items-center gap-3 rounded-md border border-border/70 bg-background/60 px-3 py-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary font-display text-[10px] text-primary-foreground">{index + 1}</span><span className="flex-1 text-[11px] font-medium">{step}</span><span className="text-[9px] uppercase tracking-wide text-muted-foreground">{when}</span></div>
                ))}
              </div>
              <Button className="mt-6">Prepare invitation <ArrowRight className="size-4" /></Button>
              <Squiggle className="mt-5 w-40 text-primary" />
            </aside>

            <section className="lg:col-span-12">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Latest signals</p><h2 className="font-display text-3xl">Evidence receipts</h2></div><div className="flex rounded-full border border-border bg-surface p-1">{(["All", "Observed", "Reported", "Inferred"] as EvidenceFilter[]).map((item) => <Button key={item} variant={filter === item ? "default" : "ghost"} size="sm" onClick={() => setFilter(item)} className="rounded-full text-[11px]">{item}</Button>)}</div></div>
              <div className="overflow-hidden rounded-[6px] border border-border bg-surface">
                {filteredEvidence.map(([title, tier, description, time], index) => <article key={title} className={`grid gap-3 p-4 sm:grid-cols-[1.1fr_.55fr_1.5fr_auto] sm:items-center ${index ? "border-t border-border" : ""}`}><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-background"><FileText className="size-4" /></span><strong className="text-sm">{title}</strong></div><span className="w-fit rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase">{tier}</span><p className="text-xs text-muted-foreground">{description}</p><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="size-3" />{time}</span></article>)}
              </div>
            </section>

            <ResearchWorkspace />
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-border px-4 py-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-7"><p>Research navigation, not medical advice. Connections and actions should be reviewed by qualified experts.</p><Link to="/" className="flex shrink-0 items-center gap-2 font-semibold text-foreground"><ArrowLeft className="size-3.5" /> Back to landing page</Link></footer>
      </div>
    </main>
  );
}