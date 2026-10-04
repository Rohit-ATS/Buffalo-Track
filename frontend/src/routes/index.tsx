import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Constellation,
  Heart,
  Magnifier,
  Neuron,
  PaperPlane,
  ScribbleCircle,
  Sparkle,
  Squiggle,
  Underline,
} from "@/components/sketches";

import communityPhoto from "@/assets/atlas-community.jpg";
import motherPhoto from "@/assets/atlas-mother.jpg";
import researcherPhoto from "@/assets/atlas-researcher.jpg";
import { Button } from "@/components/ui/button";
import { GITHUB_URL, PersonaSwitch, SearchBox } from "@/components/atlas-ui";
import { coverage } from "@/lib/atlas-data";
import { AtlasResults } from "@/components/atlas-results";
import { searchAtlas } from "@/lib/atlas-search";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Rare Disease Atlas — From diagnosis to shared action" },
      {
        name: "description",
        content:
          "Find communities that share your disease's biology, inspect the evidence behind every connection, and leave with a practical next step.",
      },
      { property: "og:title", content: "Rare Disease Atlas — From diagnosis to shared action" },
      {
        property: "og:description",
        content:
          "Follow the biology, inspect every source, and find what another rare-disease community has already built.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const examples = [
  {
    label: "Maria's journey",
    value: "STXBP1 disorder",
    tone: "bg-example-blue",
    link: { to: "/disease/$id", params: { id: "stxbp1" }, search: { q: "STXBP1 disorder" } },
  },
  {
    label: "The counterexample",
    value: "CACNA1A",
    tone: "bg-example-yellow",
    link: { to: "/compare", search: { a: "cacna1a-ea2", b: "cacna1a-fhm1" } },
  },
  {
    label: "The gap",
    value: "VAMP2",
    tone: "bg-example-mint",
    link: { to: "/disease/$id", params: { id: "vamp2" }, search: { q: "VAMP2" } },
  },
] as const;

const pathSteps = [
  ["01", "Diagnosis", "A rare SNARE-gene disorder"],
  ["02", "Mechanism", "Presynaptic vesicle fusion"],
  ["03", "Neighbor", "STXBP1-related disorder"],
  ["04", "Community", "An established foundation"],
  ["05", "Existing asset", "Natural history study"],
  ["06", "This week's action", "A sourced collaboration brief"],
];

function AtlasMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 32" fill="none" aria-hidden="true">
      <path
        d="M5 18c7-9 12-12 18-6 5 5 8 4 16-5M6 23c5-5 10-6 15-1 5 4 10 3 17-3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="6" cy="18" r="3.5" fill="currentColor" />
      <circle cx="38" cy="7" r="3.5" fill="currentColor" />
      <circle cx="38" cy="19" r="3.5" fill="currentColor" />
    </svg>
  );
}

function DnaSketch({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 150 130" fill="none" aria-hidden="true">
      <path
        d="M35 8c63 20 19 96 81 114M113 8C52 30 98 98 34 122"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {[24, 43, 63, 84, 104].map((y, i) => (
        <path
          key={y}
          d={`M${i % 2 ? 48 : 41} ${y}c22 11 39 9 62-1`}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      <path
        d="M22 37c-9-9-13 3-4 5M126 87c14 0 15 11 5 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Index() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(true);
  const mainRef = useRef<HTMLElement>(null);

  // Hits the graph through a server function: RLS blocks the anon key, so the
  // lookup has to run server-side with the service-role key.
  const atlasSearch = useMutation({
    mutationFn: (variables: { data: { query: string } }) => searchAtlas(variables),
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      setIsOpening(false);
      document.body.style.overflow = "";
    }, 2100);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;
    root.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [result]);

  const search = (value: string) => {
    const next = value.trim();
    if (!next) return;
    setQuery(next);
    setResult(next);
    atlasSearch.mutate({ data: { query: next } });
    window.setTimeout(
      () =>
        document
          .querySelector("#atlas-results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      60,
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    search(query);
  };

  return (
    <main ref={mainRef} className="overflow-hidden bg-background text-foreground">
      <div
        className={`atlas-opening ${isOpening ? "is-active" : "is-complete"}`}
        aria-hidden={!isOpening}
      >
        <div className="atlas-opening-grid" />
        <Constellation className="atlas-opening-constellation text-primary" />
        <div className="atlas-opening-center">
          <AtlasMark className="atlas-opening-mark" />
          <p className="atlas-opening-kicker">Tracing the evidence</p>
          <p className="atlas-opening-name">
            Rare Disease <em>Atlas</em>
          </p>
          <div className="atlas-opening-line">
            <span />
          </div>
          <p className="atlas-opening-note">different names · shared biology · one path forward</p>
        </div>
        <span className="atlas-opening-sketch atlas-opening-sketch-one">follow the biology →</span>
        <span className="atlas-opening-sketch atlas-opening-sketch-two">
          every edge has a receipt
        </span>
      </div>
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8">
          <a
            href="#top"
            className="flex items-center gap-2.5 font-display text-lg font-semibold"
            aria-label="Rare Disease Atlas home"
          >
            <AtlasMark className="w-9" />
            Rare Disease Atlas
          </a>
          <nav className="hidden items-center gap-8 text-sm md:flex" aria-label="Main navigation">
            <a className="hover:text-primary" href="#how-it-works">
              How it works
            </a>
            <a className="hover:text-primary" href="#evidence">
              Evidence
            </a>
            <a className="hover:text-primary" href="#action">
              Shared action
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <PersonaSwitch />
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/dashboard">
                Dashboard <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section id="top" className="mx-auto max-w-[1440px] px-5 pt-12 md:px-8 md:pt-16">
        <div className="grid items-end gap-10 lg:grid-cols-[1.06fr_.94fr]">
          <div className="pb-2">
            <div className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
              <Sparkles className="size-3.5 text-primary spin-slow" /> The map rare disease has been
              missing
            </div>
            <h1 className="word-rise max-w-[760px] font-display text-[clamp(3.15rem,6.7vw,6.5rem)] leading-[.88] font-medium">
              {["Start", "with", "a", "diagnosis."].map((w, i) => (
                <span key={w} style={{ animationDelay: `${i * 0.09}s` }}>
                  {w}&nbsp;
                </span>
              ))}
              <span style={{ animationDelay: ".45s" }} className="relative">
                <em className="font-normal text-primary">Find a path.</em>
                <Underline className="absolute -bottom-3 left-0 h-5 w-full text-primary" />
              </span>
            </h1>
            <p className="mt-7 max-w-xl animate-fade-in text-base leading-relaxed text-muted-foreground [animation-delay:.6s] [animation-fill-mode:both] md:text-lg">
              Find who shares your disease’s biology, what their community has already built, and
              the evidence behind every connection.
            </p>
          </div>
          <div className="relative hidden min-h-[310px] lg:block">
            <DnaSketch className="absolute right-4 top-0 w-32 rotate-6 text-foreground float-slow" />
            <Sparkle className="absolute right-44 top-2 w-7 text-highlight spin-slow" />
            <Sparkle className="absolute right-0 top-28 w-4 text-primary float-fast" />
            <Constellation className="absolute left-0 top-4 w-44 text-foreground/60" />
            <p className="absolute right-0 top-36 max-w-[240px] font-sketch text-2xl leading-tight rotate-[-4deg]">
              Different names.
              <br />
              Shared biology.
              <br />A way forward.
            </p>
            <svg
              className="absolute right-52 top-36 h-16 w-28 text-foreground"
              viewBox="0 0 120 65"
              fill="none"
              aria-hidden="true"
            >
              <path
                pathLength={1}
                className="sketch-draw"
                style={{ animationDelay: ".8s" }}
                d="M112 7C79 7 78 50 20 50M28 41l-11 9 12 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div
          id="search"
          className="relative mt-10 max-w-4xl scroll-mt-6 animate-fade-in [animation-delay:.75s] [animation-fill-mode:both]"
        >
          <Magnifier className="absolute -right-20 -top-8 hidden w-14 rotate-[12deg] float-fast text-foreground xl:block" />
          <SearchBox size="lg" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-sketch text-lg text-muted-foreground">try →</span>
            {examples.map((example) => (
              <Link
                key={example.value}
                {...example.link}
                className={`rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-transform hover:-translate-y-0.5 hover:rotate-[-1deg] ${example.tone}`}
              >
                <span className="text-muted-foreground">{example.label}</span> · {example.value}
              </Link>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-primary node-pulse" />
            {coverage.diseases} diseases, {coverage.connections} sourced connections, updated{" "}
            {coverage.updated}
          </p>
        </div>

        <div className="mt-12 grid h-[480px] grid-cols-[.72fr_1.35fr_.8fr] gap-2 overflow-hidden md:h-[560px] md:gap-3">
          <div className="photo-zoom photo-in relative overflow-hidden rounded-[6px] [animation-delay:.9s]">
            <img
              src={motherPhoto}
              alt="A rare disease family advocate holding her notebook"
              width={1024}
              height={1536}
              className="h-full w-full object-cover"
            />
            <Heart className="absolute right-4 top-4 w-12 text-background float-fast" />
            <div className="absolute inset-x-3 bottom-3 rounded-[5px] bg-background/92 p-3 backdrop-blur-sm md:inset-x-5 md:bottom-5">
              <span className="block text-[10px] uppercase text-muted-foreground">
                For families
              </span>
              <strong className="font-display text-lg md:text-2xl">Not another dead end.</strong>
            </div>
          </div>
          <div className="photo-zoom photo-in relative overflow-hidden rounded-[6px] [animation-delay:1.05s]">
            <img
              src={communityPhoto}
              alt="A diverse rare disease community sharing ideas around a table"
              width={1920}
              height={1280}
              className="h-full w-full object-cover"
            />
            <div className="float-slow absolute left-3 top-3 max-w-[220px] rounded-[5px] bg-background/94 p-3 shadow-soft backdrop-blur-sm md:left-5 md:top-5 md:p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <span className="text-[10px] font-semibold uppercase">Live coverage</span>
                <span className="size-2 rounded-full bg-primary node-pulse" />
              </div>
              <div className="relative inline-block font-display text-3xl md:text-5xl">
                24
                <ScribbleCircle className="absolute -inset-x-4 -inset-y-2 h-[140%] w-[200%] text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                neurodevelopmental seed genes mapped for the demo slice
              </p>
            </div>
            <div className="float-fast absolute bottom-4 right-4 hidden rounded-[5px] bg-foreground p-4 text-background shadow-soft [--r:-2deg] md:block">
              <span className="block text-[10px] uppercase opacity-70">Connection found</span>
              <strong className="mt-1 block text-sm">SNARE complex → shared study</strong>
            </div>
          </div>
          <div className="photo-zoom photo-in relative overflow-hidden rounded-[6px] [animation-delay:1.2s]">
            <img
              src={researcherPhoto}
              alt="A researcher and patient advocate reviewing a biological pathway"
              width={1536}
              height={1024}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-3 bottom-3 rounded-[5px] bg-accent p-3 md:inset-x-5 md:bottom-5 md:p-4">
              <span className="text-[10px] font-semibold uppercase text-accent-foreground/70">
                Every edge has a receipt
              </span>
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-accent-foreground">
                <Check className="size-4" /> Source checked
              </div>
            </div>
          </div>
        </div>
      </section>

      <AtlasResults result={atlasSearch.data} isPending={atlasSearch.isPending} />

      <div className="mt-12 overflow-hidden border-y border-border">
        <div className="marquee-track py-5 text-xs font-semibold">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={k === 1}>
              {[
                "Gene × variant effect",
                "Curated databases",
                "Patient-led assets",
                "Verified source quotes",
                "Expert checks",
                "Mechanism, not names",
                "Evidence receipts",
              ].map((t, i) => (
                <span key={t} className={`flex items-center gap-10 ${i % 2 ? "text-primary" : ""}`}>
                  {t}
                  <Sparkle className="w-3.5 text-foreground" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section
        id="sample-journey"
        className="relative scroll-mt-4 border-b border-border bg-surface py-20 md:py-28"
      >
        <Constellation className="pointer-events-none absolute right-[4%] top-8 hidden w-56 text-foreground/70 xl:block" />
        <div className="mx-auto max-w-[1440px] px-5 md:px-8">
          <div data-reveal className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <span className="section-tag">
                {result ? `Showing a sample path for ${result}` : "One search. A complete journey."}
              </span>
              <h2 className="mt-4 max-w-3xl font-display text-5xl leading-[.95] md:text-7xl">
                From a rare diagnosis to something a family can do{" "}
                <em className="relative inline-block text-primary">
                  this week.
                  <Underline className="absolute -bottom-1 left-0 h-3 w-full text-highlight" />
                </em>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              The atlas follows mechanism, not just names. Every step stays inspectable, sourced,
              and clear about what still needs expert review.
            </p>
          </div>
          <div
            key={result ?? "idle"}
            className="mt-14 grid gap-px overflow-hidden rounded-[6px] border border-border bg-border md:grid-cols-3 lg:grid-cols-6"
          >
            {pathSteps.map(([number, label, detail], index) => (
              <article
                key={number}
                data-reveal
                style={{ ["--d" as string]: `${index * 0.1}s` }}
                className="group relative min-h-48 bg-background p-5 transition-colors hover:bg-example-mint/40"
              >
                <span className="font-sketch text-lg text-primary transition-transform group-hover:scale-125 inline-block">
                  {number}
                </span>
                <h3 className="mt-12 text-xs font-semibold uppercase text-muted-foreground">
                  {label}
                </h3>
                <p className="mt-2 font-display text-xl leading-tight">{detail}</p>
                {index < pathSteps.length - 1 && (
                  <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden size-6 rounded-full border border-border bg-background p-1 lg:block" />
                )}
              </article>
            ))}
          </div>
          <div
            data-reveal
            className="mt-6 flex items-center gap-3 font-sketch text-xl text-muted-foreground"
          >
            <Squiggle className="w-28 text-primary" /> six steps, one continuous thread
          </div>
        </div>
      </section>

      <section id="evidence" className="border-b border-border py-20 md:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-14 px-5 md:px-8 lg:grid-cols-[.8fr_1.2fr]">
          <div data-reveal className="relative">
            <span className="section-tag">Evidence, not a black box</span>
            <h2 className="mt-4 max-w-xl font-display text-5xl leading-[.96] md:text-7xl">
              Every connection shows its work.
            </h2>
            <p className="mt-6 max-w-md text-muted-foreground">
              Source, retrieval date, confidence rule, and the exact words behind a reported
              claim—together in one clear receipt.
            </p>
            <div className="mt-8 flex items-end gap-6">
              <svg
                className="h-24 w-40 -rotate-6 text-foreground"
                viewBox="0 0 160 90"
                fill="none"
                aria-hidden="true"
              >
                <path
                  pathLength={1}
                  className="sketch-draw"
                  d="M8 69c36-32 72-38 135-29M133 28l12 12-13 11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <text x="8" y="88" fill="currentColor" className="font-sketch text-[15px]">
                  nothing hidden here
                </text>
              </svg>
              <Magnifier className="w-20 text-foreground float-fast" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <article
              data-reveal
              style={{ ["--d" as string]: "0s" }}
              className="lift evidence-card border-t-4 border-primary"
            >
              <span className="evidence-dot bg-primary node-pulse" />
              <p className="eyebrow">Observed</p>
              <h3>Registry record</h3>
              <p>Found directly in a curated database or clinical registry.</p>
              <div className="evidence-rule solid" />
            </article>
            <article
              data-reveal
              style={{ ["--d" as string]: ".15s" }}
              className="lift evidence-card border-t-4 border-foreground"
            >
              <span className="evidence-dot border-2 border-foreground bg-background" />
              <p className="eyebrow">Reported</p>
              <h3>Source quote</h3>
              <p>Extracted from a paper or group site with the verbatim passage attached.</p>
              <div className="evidence-rule solid dark" />
            </article>
            <article
              data-reveal
              style={{ ["--d" as string]: ".3s" }}
              className="lift evidence-card border-t-4 border-dashed border-highlight"
            >
              <span className="evidence-dot border-2 border-dashed border-highlight bg-background spin-slow" />
              <p className="eyebrow">Inferred</p>
              <h3>Computed link</h3>
              <p>Similarity, cluster, or suggested action with every input listed.</p>
              <div className="evidence-rule dashed" />
            </article>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="relative border-b border-border bg-contrast py-20 text-contrast-foreground md:py-28"
      >
        <Neuron className="pointer-events-none absolute bottom-8 left-[42%] hidden w-48 text-contrast-foreground/40 lg:block" />
        <div className="mx-auto max-w-[1440px] px-5 md:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div data-reveal>
              <span className="section-tag border-contrast-foreground/25">
                The atlas knows when to say no
              </span>
              <h2 className="mt-5 max-w-2xl font-display text-5xl leading-[.95] md:text-7xl">
                One gene can point in opposite directions.
              </h2>
              <p className="mt-6 max-w-lg text-contrast-muted">
                CACNA1A can involve different variant effects. The atlas keeps those mechanism units
                separate instead of forcing a persuasive—but unsafe—connection.
              </p>
            </div>
            <div
              data-reveal
              style={{ ["--d" as string]: ".2s" }}
              className="lift rounded-[6px] bg-background p-5 text-foreground md:p-8"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-sm font-semibold">Why not connected?</span>
                <span className="rounded-full bg-example-yellow px-3 py-1 text-xs">
                  Counterexample
                </span>
              </div>
              <div className="grid gap-3 py-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-[5px] bg-surface p-5">
                  <span className="eyebrow">CACNA1A</span>
                  <h3 className="mt-2 font-display text-2xl">Loss of function</h3>
                  <p className="mt-2 text-xs text-muted-foreground">Mechanism unit A</p>
                </div>
                <div className="flex items-center justify-center font-sketch text-2xl text-risk md:block">
                  <span className="wiggle inline-block text-4xl">≠</span>
                  <span className="block text-sm">kept apart</span>
                </div>
                <div className="rounded-[5px] bg-surface p-5">
                  <span className="eyebrow">CACNA1A</span>
                  <h3 className="mt-2 font-display text-2xl">Gain of function</h3>
                  <p className="mt-2 text-xs text-muted-foreground">Mechanism unit B</p>
                </div>
              </div>
              <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                Same gene name. Different biological effect. No shortcut across the evidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="action" className="relative py-20 md:py-28">
        <PaperPlane className="pointer-events-none absolute right-[6%] top-10 hidden w-44 text-foreground lg:block float-slow" />
        <div className="mx-auto max-w-[1440px] px-5 md:px-8">
          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div data-reveal>
              <span className="section-tag">The output is a letter, not a chart</span>
              <h2 className="mt-5 font-display text-5xl leading-[.95] md:text-7xl">
                Leave with a next step someone can actually{" "}
                <span className="relative inline-block">
                  send.
                  <Underline className="absolute -bottom-2 left-0 h-4 w-full text-primary" />
                </span>
              </h2>
              <p className="mt-6 max-w-lg text-muted-foreground">
                A collaboration brief brings the connection, reusable assets, differences, and
                expert questions into one sourced proposal.
              </p>
              <Button className="mt-8" onClick={() => search(query || "STX1B")}>
                Explore a sample path <ArrowRight className="size-4" />
              </Button>
            </div>
            <article
              data-reveal
              style={{ ["--d" as string]: ".15s" }}
              className="lift relative rounded-[6px] border border-border bg-surface p-5 shadow-paper md:p-10"
            >
              <span className="absolute -top-4 left-8 rotate-[-3deg] rounded-[3px] bg-example-yellow/90 px-4 py-1 font-sketch text-lg">
                draft #1 ✎
              </span>
              <Sparkle className="absolute -right-4 -top-4 w-9 text-primary spin-slow" />
              <div className="flex items-start justify-between border-b border-border pb-6">
                <div>
                  <p className="eyebrow">Collaboration brief / Draft</p>
                  <h3 className="mt-2 font-display text-3xl">A shared natural-history path</h3>
                </div>
                <FileText className="size-8 text-primary" />
              </div>
              <div className="grid gap-6 py-7 md:grid-cols-3">
                <div>
                  <span className="brief-number">01</span>
                  <h4 className="mt-3 font-semibold">What’s reusable</h4>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Existing study structure, outcome measures, and community experience.
                  </p>
                </div>
                <div>
                  <span className="brief-number">02</span>
                  <h4 className="mt-3 font-semibold">What differs</h4>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Diagnosis, variant effect, eligibility, and patient population.
                  </p>
                </div>
                <div>
                  <span className="brief-number">03</span>
                  <h4 className="mt-3 font-semibold">Expert review</h4>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Mechanism fit and whether the measures serve this cohort.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-5 text-xs">
                <span className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> Edge citations attached
                </span>
                <span className="font-sketch text-base">ready for a first call →</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer className="atlas-footer relative overflow-hidden bg-contrast text-contrast-foreground">
        <div className="atlas-footer-grid" />
        <div className="atlas-footer-glow" />
        <Constellation className="pointer-events-none absolute -left-12 top-[42%] w-64 rotate-[-10deg] text-primary/30 md:left-[3%]" />
        <Neuron className="pointer-events-none absolute -right-8 bottom-[18%] w-52 rotate-12 text-primary/25 md:right-[4%]" />

        <div className="relative z-10 mx-auto max-w-[1440px] px-5 pb-8 pt-16 md:px-8 md:pb-10 md:pt-24">
          <div
            data-reveal
            className="grid gap-12 border-b border-contrast-foreground/15 pb-14 md:grid-cols-12 md:pb-20"
          >
            <div className="md:col-span-5">
              <h2 className="max-w-sm font-display text-4xl leading-[1.05] md:text-5xl">
                Mapping the
                <br />
                <em className="relative font-normal text-primary">
                  unseen evidence.
                  <Underline className="absolute -bottom-3 left-0 h-4 w-full text-primary" />
                </em>
              </h2>
              <p className="mt-8 max-w-sm text-sm leading-relaxed text-contrast-muted">
                Begin with one diagnosis. Leave with a sourced path toward people already building
                what comes next.
              </p>
            </div>
            <nav
              className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3 md:col-span-7"
              aria-label="Footer navigation"
            >
              <div>
                <p className="atlas-footer-label">Explore</p>
                <ul className="mt-4 space-y-3 text-contrast-muted">
                  <li>
                    <a href="#search">Search the atlas</a>
                  </li>
                  <li>
                    <a href="#sample-journey">Sample journey</a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="atlas-footer-label">Evidence</p>
                <ul className="mt-4 space-y-3 text-contrast-muted">
                  <li>
                    <a href="#evidence">Evidence receipts</a>
                  </li>
                  <li>
                    <a href="#how-it-works">Why not connected?</a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="atlas-footer-label">Research</p>
                <ul className="mt-4 space-y-3 text-contrast-muted">
                  <li>
                    <Link to="/stxbp1-disorder">STXBP1 disorder</Link>
                  </li>
                  <li>
                    <a href="#action">Collaboration brief</a>
                  </li>
                </ul>
              </div>
            </nav>
          </div>

          <div
            data-reveal
            className="atlas-footer-word-wrap relative flex min-h-[230px] items-center justify-center py-10 md:min-h-[390px] md:py-14"
          >
            <Sparkle className="absolute right-[9%] top-[18%] w-8 text-primary spin-slow md:w-12" />
            <span className="absolute left-[5%] top-[18%] rotate-[-7deg] font-sketch text-lg text-primary/70 md:text-2xl">
              a map for the overlooked ↘
            </span>
            <p className="atlas-footer-word select-none font-display leading-[.76]">Atlas</p>
            <svg
              className="absolute bottom-[15%] left-1/2 h-10 w-[72%] -translate-x-1/2 text-primary/60"
              viewBox="0 0 900 44"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                pathLength={1}
                className="sketch-draw"
                d="M8 29c175-18 340 8 515-6 140-11 249-7 368 2M102 37c190-13 392 11 630-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col gap-6 border-t border-contrast-foreground/15 pt-7 text-xs text-contrast-muted md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 flex items-center gap-2 font-display text-base text-contrast-foreground">
                <AtlasMark className="w-8 text-primary" /> Rare Disease Atlas
              </div>
              <p className="leading-relaxed">
                Research navigation, not medical advice. Connections and actions should be reviewed
                by qualified experts.
              </p>
            </div>
            <div className="flex items-center gap-5 font-semibold text-contrast-foreground">
              <Link to="/methods" className="hover:text-primary">
                Methods
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-primary">
                GitHub
              </a>
              <a href="#top" className="group flex items-center gap-2">
                Back to top{" "}
                <ArrowDown className="size-4 rotate-180 transition-transform group-hover:-translate-y-1" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
