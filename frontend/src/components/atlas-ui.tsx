import { Link, useNavigate } from "@tanstack/react-router";
import { trackDashboardClick } from "@/lib/track-dashboard-click";
import {
  AlertCircle,
  ArrowRight,
  Copy,
  Download,
  ExternalLink,
  Github,
  Loader2,
  Search,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  diseaseById,
  edgesFor,
  other,
  searchAtlas,
  sourceById,
  type Disease,
  type Edge,
  type Match,
  type Tier,
} from "@/lib/atlas-data";
import { personas, usePersona, type PersonaId } from "@/lib/persona";

export const GITHUB_URL = "https://github.com/"; // placeholder until the real repo link is provided

export function AtlasMark({ className = "" }: { className?: string }) {
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

/* ---------- Evidence tiers ---------- */
export const tierLabel: Record<Tier, string> = {
  observed: "Observed",
  reported: "Reported",
  inferred: "Inferred",
};
export function TierBadge({ tier }: { tier: Tier }) {
  const cls =
    tier === "observed"
      ? "border-primary bg-primary text-primary-foreground"
      : tier === "reported"
        ? "border-primary text-primary"
        : "border-dashed border-primary/70 text-primary";
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {tierLabel[tier]}
    </span>
  );
}
export function TierLine({ tier, className = "w-10" }: { tier: Tier; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 8" preserveAspectRatio="none" aria-hidden="true">
      {tier === "reported" ? (
        <>
          <line x1="0" y1="4" x2="40" y2="4" stroke="var(--primary)" strokeWidth="6" />
          <line x1="0" y1="4" x2="40" y2="4" stroke="var(--background)" strokeWidth="2.5" />
        </>
      ) : (
        <line
          x1="0"
          y1="4"
          x2="40"
          y2="4"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeDasharray={tier === "inferred" ? "5 4" : undefined}
        />
      )}
    </svg>
  );
}
export function EvidenceKey({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground ${className}`}
      aria-label="Evidence key"
    >
      {(["observed", "reported", "inferred"] as Tier[]).map((t) => (
        <span key={t} className="inline-flex items-center gap-1.5">
          <TierLine tier={t} className="w-7" />
          {tierLabel[t]}
        </span>
      ))}
    </div>
  );
}

/* ---------- Evidence drawer ---------- */
const DrawerCtx = createContext<(e: Edge) => void>(() => {});
export const useEvidenceDrawer = () => useContext(DrawerCtx);
export function CitationChip({ edge, n }: { edge: Edge; n: number }) {
  const open = useEvidenceDrawer();
  return (
    <button
      type="button"
      onClick={() => open(edge)}
      className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-primary px-1.5 align-middle text-[10px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      aria-label={`Open evidence ${n}`}
    >
      {n}
    </button>
  );
}
function EvidenceDrawer({ edge, onClose }: { edge: Edge | null; onClose: () => void }) {
  const src = edge ? sourceById(edge.source) : null;
  return (
    <Sheet open={!!edge} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {edge && src && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <TierBadge tier={edge.tier} />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {edge.type}
                </span>
              </div>
              <SheetTitle className="font-display text-2xl font-medium leading-tight">
                {edge.sentence}
              </SheetTitle>
              <SheetDescription>
                {diseaseById(edge.from)?.name} ↔ {diseaseById(edge.to)?.name}
              </SheetDescription>
            </SheetHeader>
            <dl className="mt-6 space-y-5 text-sm">
              <div>
                <dt className="eyebrow">Source</dt>
                <dd>
                  <a
                    href={edge.sourceUrl ?? src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {src.name} <ExternalLink className="size-3.5" />
                  </a>
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="eyebrow">Source record</dt>
                  <dd>{edge.sourceRecordId ?? "Source-level record"}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Clinical proof</dt>
                  <dd
                    className={
                      edge.clinicalProof ? "font-semibold text-primary" : "text-muted-foreground"
                    }
                  >
                    {edge.clinicalProof ? "Direct clinical evidence" : "Not established"}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="eyebrow">Exact quote</dt>
                <dd>
                  {edge.quote ? (
                    <blockquote className="border-l-2 border-primary pl-3 font-display text-lg italic">
                      “{edge.quote}”
                    </blockquote>
                  ) : (
                    <span className="text-muted-foreground">
                      Not a paper claim — derived from structured data.
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Date retrieved</dt>
                <dd>{edge.retrieved}</dd>
              </div>
              <div>
                <dt className="eyebrow">Confidence</dt>
                <dd>
                  <span className="font-display text-3xl">{edge.confidence.toFixed(2)}</span>
                  <p className="text-muted-foreground">Rule: {edge.rule}</p>
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Extraction method</dt>
                <dd>{edge.method}</dd>
              </div>
              <div>
                <dt className="eyebrow">Contradicting evidence</dt>
                <dd>
                  {edge.contradicting ? (
                    <p className="rounded-md border border-risk/40 bg-risk/10 p-3">
                      {edge.contradicting}
                    </p>
                  ) : (
                    <span className="text-muted-foreground">None found in current sources.</span>
                  )}
                </dd>
              </div>
            </dl>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Search with autocomplete ---------- */
export function SearchBox({
  size = "sm",
  initial = "",
  onSearched,
}: {
  size?: "sm" | "lg";
  initial?: string;
  onSearched?: (q: string) => void;
}) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const id = useId();
  const matches = searchAtlas(q);
  const go = (m: Match) => {
    setOpen(false);
    onSearched?.(m.alias ?? m.label);
    navigate({
      to: "/disease/$id",
      params: { id: m.diseaseId },
      search: { q: m.alias ?? m.label, tab: "journey" },
    });
  };
  const submit = () => {
    if (!q.trim()) return;
    if (matches[active]) go(matches[active]);
    else {
      setOpen(false);
      navigate({ to: "/disease/$id", params: { id: "not-found" }, search: { q, tab: "journey" } });
    }
  };
  const lg = size === "lg";
  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`flex items-center rounded-full border border-foreground bg-background shadow-search focus-within:ring-2 focus-within:ring-ring ${lg ? "min-h-16 p-1.5 pl-5" : "h-10 pl-3 pr-1"}`}
      >
        <Search className={`${lg ? "mr-3 size-5" : "mr-2 size-4"} shrink-0`} aria-hidden="true" />
        <label htmlFor={id} className="sr-only">
          Search the atlas
        </label>
        <input
          id={id}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={`${id}-list`}
          autoComplete="off"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, matches.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Escape") setOpen(false);
          }}
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground ${lg ? "text-base" : "text-sm"}`}
          placeholder={lg ? "Search a disease, gene, symptom, group, or mechanism" : "New search…"}
        />
        <Button type="submit" size={lg ? "default" : "sm"} className="group shrink-0 rounded-full">
          {lg ? (
            <>
              Follow the biology{" "}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          ) : (
            <ArrowRight className="size-4" />
          )}
        </Button>
      </form>
      {open && q.trim() && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-popover text-left shadow-paper"
        >
          {matches.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">
              No match yet. Try a gene like <b>STX1B</b> or a symptom like <b>epilepsy</b>, or press
              Enter to see what we searched.
            </li>
          ) : (
            matches.map((m, i) => (
              <li key={m.label} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(m)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm ${i === active ? "bg-surface" : ""}`}
                >
                  <span className="truncate">{m.label}</span>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {m.type}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/* ---------- Persona switch ---------- */
export function PersonaSwitch() {
  const { persona, setPersona } = usePersona();
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="hidden text-muted-foreground lg:inline">Viewing as</span>
      <select
        value={persona}
        onChange={(e) => setPersona(e.target.value as PersonaId)}
        className="h-9 rounded-full border border-border bg-background px-3 text-xs font-semibold"
        aria-label="Viewing as"
      >
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.role}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------- Shell ---------- */
type NavItem = { label: string; render: (cls: string, active: { className: string }) => ReactNode };
const nav = (label: string, render: NavItem["render"]): NavItem => ({ label, render });
const methods = nav("Methods", (c, a) => (
  <Link to="/methods" className={c} activeProps={a}>
    Methods
  </Link>
));
const mechs = nav("Mechanisms", (c, a) => (
  <Link to="/mechanisms" className={c} activeProps={a}>
    Mechanisms
  </Link>
));
const navByPersona: Record<PersonaId, NavItem[]> = {
  maria: [
    nav("My journey", (c, a) => (
      <Link to="/disease/$id" params={{ id: "stxbp1" }} className={c} activeProps={a}>
        My journey
      </Link>
    )),
    nav("Why not connected", (c, a) => (
      <Link to="/compare" className={c} activeProps={a}>
        Why not connected
      </Link>
    )),
    methods,
  ],
  devon: [
    nav("Assets", (c) => (
      <Link to="/disease/$id" params={{ id: "stxbp1" }} search={{ tab: "action" }} className={c}>
        Assets
      </Link>
    )),
    nav("Dashboard", (c, a) => (
      <Link
        to="/dashboard"
        className={c}
        activeProps={a}
        onClick={() => trackDashboardClick("nav_devon")}
      >
        Dashboard
      </Link>
    )),
    methods,
  ],
  priya: [
    mechs,
    nav("Map", (c) => (
      <Link to="/disease/$id" params={{ id: "stxbp1" }} search={{ tab: "map" }} className={c}>
        Map
      </Link>
    )),
    methods,
  ],
  osei: [
    nav("Researchers", (c, a) => (
      <Link to="/researchers" className={c} activeProps={a}>
        Researchers
      </Link>
    )),
    mechs,
    methods,
  ],
};

export function SiteHeader() {
  const { persona } = usePersona();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-[1440px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 md:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-lg"
          aria-label="Rare Disease Atlas home"
        >
          <AtlasMark className="w-8 shrink-0" />
          <span className="hidden sm:inline">Rare Disease Atlas</span>
        </Link>
        <div className="mx-auto w-full max-w-md">
          <SearchBox />
        </div>
        <PersonaSwitch />
      </div>
      <nav
        className="mx-auto flex max-w-[1440px] gap-5 overflow-x-auto px-4 pb-2 text-sm md:px-8"
        aria-label="Main navigation"
      >
        {navByPersona[persona].map((n) => (
          <span key={n.label} className="shrink-0">
            {n.render("text-muted-foreground hover:text-primary", {
              className: "text-foreground font-semibold",
            })}
          </span>
        ))}
        <EvidenceKey className="ml-auto hidden md:flex" />
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-8">
        <p className="font-semibold">Research navigation, not medical advice.</p>
        <div className="flex items-center gap-5">
          <Link to="/methods" className="hover:text-primary">
            Methods
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-primary"
          >
            <Github className="size-4" /> GitHub
          </a>
          <Link to="/" className="hover:text-primary">
            New search
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function AtlasShell({ children }: { children: ReactNode }) {
  const [edge, setEdge] = useState<Edge | null>(null);
  return (
    <DrawerCtx.Provider value={setEdge}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <EvidenceKey className="mx-auto px-4 py-3 md:hidden" />
        <SiteFooter />
      </div>
      <EvidenceDrawer edge={edge} onClose={() => setEdge(null)} />
    </DrawerCtx.Provider>
  );
}

export function StateMessage({
  kind,
  title,
  children,
  action,
}: {
  kind: "loading" | "empty" | "error";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className="mx-auto my-16 max-w-lg rounded-lg border border-dashed border-border p-8 text-center"
    >
      {kind === "loading" ? (
        <Loader2 className="mx-auto size-6 animate-spin text-primary" />
      ) : (
        <AlertCircle
          className={`mx-auto size-6 ${kind === "error" ? "text-destructive" : "text-muted-foreground"}`}
        />
      )}
      <h2 className="mt-3 font-display text-2xl">{title}</h2>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Collaboration brief ---------- */
export function BriefDialog({
  disease,
  open,
  onOpenChange,
}: {
  disease: Disease;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const rel = edgesFor(disease.id);
  const top = rel[0];
  const partner = top ? diseaseById(other(top, disease.id)) : undefined;
  const ref = useRef<HTMLDivElement>(null);
  const sections: [string, string][] = [
    ["Who we are", `Families and researchers working on ${disease.name} (${disease.gene}).`],
    [
      "The connection and its evidence",
      partner
        ? `${disease.name} and ${partner.name} share ${top!.type}: ${top!.sentence} [1]`
        : "No supported connection yet.",
    ],
    [
      "What we want to reuse",
      partner?.assets.map((x) => `${x.name} (${x.owner})`).join("; ") || "To be identified.",
    ],
    [
      "What differs",
      partner ? `Gene (${disease.gene} vs ${partner.gene}); symptom overlap is partial.` : "—",
    ],
    [
      "What needs expert review",
      "Whether outcome measures and age ranges transfer between cohorts.",
    ],
    [
      "Proposed first call",
      "A 30-minute call with the study lead and one family representative within two weeks.",
    ],
  ];
  const text = `Collaboration brief — ${disease.name}\n\n${sections.map(([h, b], i) => `${i + 1}. ${h}\n${b}`).join("\n\n")}\n\nCitations\n${rel.map((r, i) => `[${i + 1}] ${sourceById(r.source).name} — ${sourceById(r.source).url} (retrieved ${r.retrieved})`).join("\n")}\n\nResearch navigation, not medical advice.`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Brief copied as email text");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  };
  const pdf = () => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Allow pop-ups to download the PDF.");
      return;
    }
    w.document.write(
      `<pre style="font:14px/1.6 Georgia,serif;white-space:pre-wrap;padding:40px">${text.replace(/</g, "&lt;")}</pre>`,
    );
    w.document.close();
    w.print();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-medium">
            Collaboration brief
          </DialogTitle>
          <DialogDescription>
            {disease.name} · draft generated from sourced connections
          </DialogDescription>
        </DialogHeader>
        <div ref={ref} className="space-y-4">
          {sections.map(([h, b], i) => (
            <section key={h}>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className="brief-number">{i + 1}</span>
                {h}
              </h3>
              <p className="mt-1 pl-8 text-sm text-muted-foreground">{b}</p>
            </section>
          ))}
          <section className="border-t border-border pt-3">
            <h3 className="eyebrow">Citations</h3>
            <ol className="mt-1 space-y-1 text-xs">
              {rel.map((r, i) => (
                <li key={r.id}>
                  [{i + 1}]{" "}
                  <a
                    className="text-primary underline"
                    href={sourceById(r.source).url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {sourceById(r.source).name}
                  </a>{" "}
                  — {r.sentence}
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={copy}>
            <Copy className="size-4" /> Copy as email text
          </Button>
          <Button variant="outline" onClick={pdf}>
            <Download className="size-4" /> Download as PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
