import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
} from "lucide-react";

import researcherPhoto from "@/assets/atlas-researcher.jpg";
import communityPhoto from "@/assets/atlas-community.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/stxbp1-disorder")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "STXBP1 Disorder Research — Rare Disease Atlas" },
      {
        name: "description",
        content:
          "Explore STXBP1-related disorder research: how this SNARE-complex gene connects to neighboring rare diseases, the evidence behind each link, and a collaboration brief your community can send.",
      },
      { property: "og:title", content: "STXBP1 Disorder Research — Rare Disease Atlas" },
      {
        property: "og:description",
        content:
          "Follow the biology of STXBP1-related disorder, inspect every source, and find what neighboring rare-disease communities have already built.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/stxbp1-disorder" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/stxbp1-disorder" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "STXBP1 Disorder Research — Rare Disease Atlas",
          description:
            "How STXBP1-related disorder connects to neighboring rare diseases through shared SNARE-complex biology, with sourced evidence and a collaboration brief.",
        }),
      },
    ],
  }),
  component: Stxbp1Page,
});

const pathSteps = [
  ["01", "Diagnosis", "STXBP1-related disorder"],
  ["02", "Mechanism", "Presynaptic vesicle fusion"],
  ["03", "Neighbor", "STX1B and other SNARE genes"],
  ["04", "Community", "An established foundation"],
  ["05", "Existing asset", "Natural history study"],
  ["06", "This week's action", "A sourced collaboration brief"],
];

const connections = [
  {
    gene: "STX1B",
    tier: "Observed",
    tone: "border-primary",
    dot: "bg-primary",
    rule: "solid",
    note: "Shares the SNARE-complex mechanism: presynaptic vesicle fusion. Found in curated databases.",
  },
  {
    gene: "SNARE gene disorders",
    tier: "Reported",
    tone: "border-foreground",
    dot: "border-2 border-foreground bg-background",
    rule: "solid dark",
    note: "Reported in papers and group sites as a mechanistic family; verbatim passages attached.",
  },
  {
    gene: "Suggested cohorts",
    tier: "Inferred",
    tone: "border-dashed border-highlight",
    dot: "border-2 border-dashed border-highlight bg-background",
    rule: "dashed",
    note: "Computed similarity links with every input listed, pending expert review.",
  },
];

function AtlasMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 32" fill="none" aria-hidden="true">
      <path d="M5 18c7-9 12-12 18-6 5 5 8 4 16-5M6 23c5-5 10-6 15-1 5 4 10 3 17-3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="6" cy="18" r="3.5" fill="currentColor" /><circle cx="38" cy="7" r="3.5" fill="currentColor" /><circle cx="38" cy="19" r="3.5" fill="currentColor" />
    </svg>
  );
}

function Stxbp1Page() {
  return (
    <main className="overflow-hidden bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8">
          <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-semibold" aria-label="Rare Disease Atlas home">
            <AtlasMark className="w-9" />
            Rare Disease Atlas
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/"><ArrowLeft className="size-3.5" /> Back to the atlas</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-5 pt-12 md:px-8 md:pt-16">
        <div className="grid items-end gap-10 lg:grid-cols-[1.06fr_.94fr]">
          <div className="pb-2">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
              <span className="size-2 rounded-full bg-primary" /> Research page · SNARE-complex biology
            </div>
            <h1 className="max-w-[760px] font-display text-[clamp(2.9rem,6vw,5.75rem)] leading-[.9] font-medium">
              STXBP1 disorder, <em className="font-normal text-primary">mapped.</em>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              STXBP1-related disorder sits in the SNARE-complex family—the machinery of presynaptic vesicle fusion. The atlas follows that mechanism to neighboring diagnoses, existing studies, and communities that have already built what this one needs.
            </p>
          </div>
          <div className="relative hidden min-h-[280px] lg:block">
            <svg className="absolute right-4 top-0 w-32 rotate-6 text-foreground" viewBox="0 0 150 130" fill="none" aria-hidden="true">
              <path d="M35 8c63 20 19 96 81 114M113 8C52 30 98 98 34 122" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              {[24, 43, 63, 84, 104].map((y, i) => <path key={y} d={`M${i % 2 ? 48 : 41} ${y}c22 11 39 9 62-1`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />)}
            </svg>
            <p className="absolute right-0 top-36 max-w-[240px] font-sketch text-2xl leading-tight rotate-[-4deg]">One gene.<br/>A mechanism family.<br/>A shared study.</p>
          </div>
        </div>

        <div className="mt-12 grid h-[420px] grid-cols-[1.35fr_.8fr] gap-2 overflow-hidden md:h-[500px] md:gap-3">
          <div className="relative overflow-hidden rounded-[6px]">
            <img src={communityPhoto} alt="A diverse rare disease community sharing ideas around a table" width={1920} height={1280} className="h-full w-full object-cover" />
            <div className="absolute left-3 top-3 max-w-[240px] rounded-[5px] bg-background/94 p-3 shadow-soft backdrop-blur-sm md:left-5 md:top-5 md:p-4">
              <div className="mb-3 flex items-center justify-between gap-4"><span className="text-[10px] font-semibold uppercase">Connection found</span><span className="size-2 rounded-full bg-primary" /></div>
              <div className="font-display text-2xl md:text-4xl">STXBP1 → SNARE family</div>
              <p className="mt-1 text-xs text-muted-foreground">mechanism-first, not name-first</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[6px]">
            <img src={researcherPhoto} alt="A researcher and patient advocate reviewing a biological pathway" width={1536} height={1024} loading="lazy" className="h-full w-full object-cover" />
            <div className="absolute inset-x-3 bottom-3 rounded-[5px] bg-accent p-3 md:inset-x-5 md:bottom-5 md:p-4">
              <span className="text-[10px] font-semibold uppercase text-accent-foreground/70">Every edge has a receipt</span>
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-accent-foreground"><Check className="size-4" /> Source checked</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12 scroll-mt-4 border-y border-border bg-surface py-20 md:py-28">
        <div className="mx-auto max-w-[1440px] px-5 md:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <span className="section-tag">A sample path for STXBP1</span>
              <h2 className="mt-4 max-w-3xl font-display text-5xl leading-[.95] md:text-7xl">From this diagnosis to something a family can do <em className="text-primary">this week.</em></h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">The atlas follows mechanism, not just names. Every step stays inspectable, sourced, and clear about what still needs expert review.</p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[6px] border border-border bg-border md:grid-cols-3 lg:grid-cols-6">
            {pathSteps.map(([number, label, detail], index) => (
              <article key={number} className="relative min-h-48 bg-background p-5">
                <span className="font-sketch text-lg text-primary">{number}</span>
                <h3 className="mt-12 text-xs font-semibold uppercase text-muted-foreground">{label}</h3>
                <p className="mt-2 font-display text-xl leading-tight">{detail}</p>
                {index < pathSteps.length - 1 && <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden size-6 rounded-full border border-border bg-background p-1 lg:block" />}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-20 md:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-14 px-5 md:px-8 lg:grid-cols-[.8fr_1.2fr]">
          <div className="relative">
            <span className="section-tag">Evidence, not a black box</span>
            <h2 className="mt-4 max-w-xl font-display text-5xl leading-[.96] md:text-7xl">Every STXBP1 connection shows its work.</h2>
            <p className="mt-6 max-w-md text-muted-foreground">Source, retrieval date, confidence rule, and the exact words behind a reported claim—together in one clear receipt.</p>
            <svg className="mt-8 h-24 w-40 -rotate-6 text-foreground" viewBox="0 0 160 90" fill="none" aria-hidden="true"><path d="M8 69c36-32 72-38 135-29M133 28l12 12-13 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><text x="8" y="88" fill="currentColor" className="font-sketch text-[15px]">nothing hidden here</text></svg>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {connections.map((connection) => (
              <article key={connection.gene} className={`evidence-card border-t-4 ${connection.tone}`}>
                <span className={`evidence-dot ${connection.dot}`} />
                <p className="eyebrow">{connection.tier}</p>
                <h3>{connection.gene}</h3>
                <p>{connection.note}</p>
                <div className={`evidence-rule ${connection.rule}`} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-contrast py-20 text-contrast-foreground md:py-28">
        <div className="mx-auto max-w-[1440px] px-5 md:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="section-tag border-contrast-foreground/25">The atlas knows when to say no</span>
              <h2 className="mt-5 max-w-2xl font-display text-5xl leading-[.95] md:text-7xl">One gene can point in opposite directions.</h2>
              <p className="mt-6 max-w-lg text-contrast-muted">The same discipline that maps STXBP1 also protects it: genes like CACNA1A can involve different variant effects, and the atlas keeps those mechanism units separate instead of forcing a persuasive—but unsafe—connection.</p>
            </div>
            <div className="rounded-[6px] bg-background p-5 text-foreground md:p-8">
              <div className="flex items-center justify-between border-b border-border pb-4"><span className="text-sm font-semibold">Why not connected?</span><span className="rounded-full bg-example-yellow px-3 py-1 text-xs">Counterexample</span></div>
              <div className="grid gap-3 py-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-[5px] bg-surface p-5"><span className="eyebrow">CACNA1A</span><h3 className="mt-2 font-display text-2xl">Loss of function</h3><p className="mt-2 text-xs text-muted-foreground">Mechanism unit A</p></div>
                <div className="flex items-center justify-center font-sketch text-2xl text-risk md:block"><span>≠</span><span className="block text-sm">kept apart</span></div>
                <div className="rounded-[5px] bg-surface p-5"><span className="eyebrow">CACNA1A</span><h3 className="mt-2 font-display text-2xl">Gain of function</h3><p className="mt-2 text-xs text-muted-foreground">Mechanism unit B</p></div>
              </div>
              <p className="border-t border-border pt-4 text-xs text-muted-foreground">Same gene name. Different biological effect. No shortcut across the evidence.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-[1440px] px-5 md:px-8">
          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <span className="section-tag">The output is a letter, not a chart</span>
              <h2 className="mt-5 font-display text-5xl leading-[.95] md:text-7xl">A collaboration brief the STXBP1 community can send.</h2>
              <p className="mt-6 max-w-lg text-muted-foreground">The brief brings the SNARE-complex connection, reusable study assets, differences, and expert questions into one sourced proposal.</p>
              <Button asChild className="mt-8"><Link to="/">Explore the full atlas <ArrowRight className="size-4" /></Link></Button>
            </div>
            <article className="relative rounded-[6px] border border-border bg-surface p-5 shadow-paper md:p-10">
              <div className="flex items-start justify-between border-b border-border pb-6"><div><p className="eyebrow">Collaboration brief / Draft</p><h3 className="mt-2 font-display text-3xl">A shared natural-history path</h3></div><FileText className="size-8 text-primary" /></div>
              <div className="grid gap-6 py-7 md:grid-cols-3">
                <div><span className="brief-number">01</span><h4 className="mt-3 font-semibold">What’s reusable</h4><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Existing study structure, outcome measures, and community experience from SNARE-family neighbors.</p></div>
                <div><span className="brief-number">02</span><h4 className="mt-3 font-semibold">What differs</h4><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Diagnosis, variant effect, eligibility, and patient population.</p></div>
                <div><span className="brief-number">03</span><h4 className="mt-3 font-semibold">Expert review</h4><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Mechanism fit and whether the measures serve the STXBP1 cohort.</p></div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-5 text-xs"><span className="flex items-center gap-2"><Check className="size-4 text-primary" /> Edge citations attached</span><span className="font-sketch text-base">ready for a first call →</span></div>
            </article>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8">
          <div><div className="flex items-center gap-2 font-display text-lg font-semibold"><AtlasMark className="w-9" /> Rare Disease Atlas</div><p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">Research navigation, not medical advice. Connections and actions should be reviewed by qualified experts.</p></div>
          <a href="#top" className="flex items-center gap-2 text-sm font-semibold">Back to top <ArrowDown className="size-4 rotate-180" /></a>
        </div>
      </footer>
    </main>
  );
}
