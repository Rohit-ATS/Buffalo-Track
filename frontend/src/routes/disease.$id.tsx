import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, FileText, Users } from "lucide-react";
import { useState } from "react";
import { AtlasShell, BriefDialog, CitationChip, EvidenceKey, StateMessage, TierBadge, TierLine, useEvidenceDrawer } from "@/components/atlas-ui";
import { Button } from "@/components/ui/button";
import { clusters, diseaseById, diseases, edges, edgesFor, other, similarity, sourceById, sources, type Disease, type Tier } from "@/lib/atlas-data";
import { usePersona } from "@/lib/persona";

const TABS = ["journey", "action", "map", "evidence"] as const;
type Tab = (typeof TABS)[number];
const SITE = "https://gleam-artistic-page.lovable.app";

export const Route = createFileRoute("/disease/$id")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined; tab?: Tab | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    tab: TABS.includes(s["tab"] as Tab) ? (s["tab"] as Tab) : undefined,
  }),
  loader: ({ params }) => {
    if (params.id === "not-found") return { disease: null };
    const disease = diseaseById(params.id);
    if (!disease) throw notFound();
    return { disease };
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.disease?.name ?? "No supported route";
    const title = `${name} — Rare Disease Atlas`;
    const desc = loaderData?.disease ? `Shared biology, sourced connections, and next steps for ${name}.` : "We searched every source and found no supported route yet.";
    return {
      meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }, { property: "og:type", content: "article" }, { property: "og:url", content: `${SITE}/disease/${params.id}` }, { name: "twitter:card", content: "summary" }, ...(loaderData?.disease ? [] : [{ name: "robots", content: "noindex" }])],
      links: [{ rel: "canonical", href: `${SITE}/disease/${params.id}` }],
    };
  },
  component: DiseasePage,
  pendingComponent: () => <AtlasShell><StateMessage kind="loading" title="Tracing the evidence…">Loading connections for this diagnosis.</StateMessage></AtlasShell>,
  notFoundComponent: () => <AtlasShell><StateMessage kind="empty" title="We don't have that disease yet" action={<Button asChild><Link to="/">Start a new search</Link></Button>}>Check the spelling or search by gene or symptom instead.</StateMessage></AtlasShell>,
  errorComponent: ({ reset }) => { const router = useRouter(); return <AtlasShell><StateMessage kind="error" title="Something went wrong loading this page" action={<Button onClick={() => { router.invalidate(); reset(); }}>Try again</Button>}>Your search is safe. Retry, or start a new search from the header.</StateMessage></AtlasShell>; },
});

function DiseasePage() {
  const { disease } = Route.useLoaderData();
  const { q } = Route.useSearch();
  return <AtlasShell>{!disease || disease.noRoute ? <NoRoute q={q ?? disease?.name ?? ""} disease={disease} /> : <DiseaseView disease={disease} />}</AtlasShell>;
}

function DiseaseView({ disease }: { disease: Disease }) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { persona } = usePersona();
  const tab: Tab = search.tab ?? (persona === "devon" ? "action" : persona === "priya" ? "map" : persona === "osei" ? "evidence" : "journey");
  const cluster = clusters.find((c) => c.id === disease.cluster)!;
  const rel = edgesFor(disease.id);
  const neighbors = rel.map((e) => diseaseById(other(e, disease.id))!);
  const communities = neighbors.filter((n) => n.patientGroup).length;
  const assets = neighbors.reduce((s, n) => s + n.assets.length, disease.assets.length);
  const showBanner = search.q && search.q.toLowerCase() !== disease.name.toLowerCase();
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
      {showBanner && <p className="mb-5 rounded-md border border-border bg-surface px-4 py-2.5 text-sm">You searched <b>{search.q}</b>. Showing <b>{disease.name}</b>, also known as {disease.synonyms.join(", ")}.</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="eyebrow">{cluster.name} cluster</p>
          <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,4.2rem)] leading-[.95]">{disease.name}</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-border px-3 py-1">Gene <b>{disease.gene}</b></span>
            <span className="rounded-full border border-border px-3 py-1 capitalize">{disease.mechanism}</span>
            <span className="rounded-full border border-border px-3 py-1">{disease.pathway}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[[communities, "related communities"], [assets, "existing assets"], [disease.openQuestions.length, "open questions"]].map(([n, l]) => (
            <div key={l} className="rounded-lg border border-border p-3 text-center lg:w-36"><div className="font-display text-3xl">{n}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>
          ))}
        </div>
      </div>
      <div role="tablist" className="mt-8 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => navigate({ search: (p) => ({ ...p, tab: t }) })} className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm capitalize ${tab === t ? "border-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>)}
      </div>
      <div className="py-8">
        {tab === "journey" && <Journey disease={disease} />}
        {tab === "action" && <Action disease={disease} />}
        {tab === "map" && <ClusterMap current={disease.id} />}
        {tab === "evidence" && <EvidenceTable disease={disease} />}
      </div>
    </div>
  );
}

function Journey({ disease }: { disease: Disease }) {
  const rel = [...edgesFor(disease.id)].sort((a, b) => b.confidence - a.confidence);
  const top = rel[0];
  const partner = top ? diseaseById(other(top, disease.id))! : undefined;
  const group = partner?.patientGroup ? partner : disease;
  const asset = partner?.assets[0] ?? disease.assets[0];
  const steps: { label: string; title: string; sentence: string; tier: Tier; cite?: number }[] = [
    { label: "Disease", title: disease.name, sentence: `A ${disease.mechanism} condition in the ${disease.gene} gene.`, tier: "observed" },
    { label: "Mechanism", title: disease.pathway, sentence: `${disease.gene} works in ${disease.pathway.toLowerCase()}.`, tier: top?.tier ?? "reported", cite: 0 },
    { label: "Related disease", title: partner?.name ?? "—", sentence: top?.sentence ?? "No related disease found.", tier: "reported", cite: 0 },
    { label: "Patient group", title: group.patientGroup ?? "None yet", sentence: `${group.patientGroup ?? "No group"} already supports families with similar biology.`, tier: "observed", cite: 1 },
    { label: "Asset", title: asset?.name ?? "None yet", sentence: asset ? `Run by ${asset.owner}; could be reused rather than rebuilt.` : "No shared asset yet.", tier: "inferred", cite: 2 },
    { label: "Next step", title: "Send a collaboration brief", sentence: "Ask the asset owner for a 30-minute call this week.", tier: "inferred" },
  ];
  const sameGene = diseases.filter((d) => d.id !== disease.id && (d.gene === disease.gene || d.name.split(" ")[0] === disease.name.split(" ")[0]) && (d.cluster !== disease.cluster || d.mechanism !== disease.mechanism));
  const closest = diseases.filter((d) => d.id !== disease.id).map((d) => ({ d, s: similarity(disease.id, d.id) })).sort((a, b) => b.s.mechanism + b.s.symptoms - (a.s.mechanism + a.s.symptoms)).slice(0, 5);
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between gap-4"><h2 className="font-display text-3xl">Your path</h2><EvidenceKey /></div>
      <ol className="grid gap-4 md:grid-cols-6 md:gap-0">
        {steps.map((s, i) => (
          <li key={s.label} className="relative md:pr-6">
            <div className="flex items-center gap-2"><span className="brief-number">{i + 1}</span>{steps[i + 1] && <TierLine tier={steps[i + 1]!.tier} className="hidden h-2 flex-1 md:block" />}</div>
            <p className="mt-3 eyebrow">{s.label}</p>
            <p className="font-display text-xl leading-tight">{s.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{s.sentence}{s.cite !== undefined && rel[s.cite] && <CitationChip edge={rel[s.cite]!} n={s.cite + 1} />}</p>
          </li>
        ))}
      </ol>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <h3 className="font-display text-2xl">Closest related diseases</h3>
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {closest.map(({ d, s }) => (
              <li key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
                <Link to="/disease/$id" params={{ id: d.id }} className="min-w-0 truncate font-semibold hover:text-primary">{d.name}</Link>
                <div className="flex gap-4 text-xs">
                  <Score label="Mechanism" v={s.mechanism} /><Score label="Symptoms" v={s.symptoms} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        {sameGene.length > 0 && (
          <aside className="rounded-lg bg-contrast p-6 text-contrast-foreground">
            <p className="font-sketch text-xl">why not connected?</p>
            {sameGene.map((d) => <p key={d.id} className="mt-2 text-sm"><b>{d.name}</b> shares {d.gene === disease.gene ? `the ${d.gene} gene` : "a similar name"} but sits apart. <Link to="/compare" search={{ a: disease.id, b: d.id }} className="underline">See why <ArrowRight className="inline size-3.5" /></Link></p>)}
          </aside>
        )}
      </div>
    </div>
  );
}

function Score({ label, v }: { label: string; v: number }) {
  return <div className="w-20"><div className="flex justify-between text-muted-foreground"><span>{label}</span><b className="text-foreground">{v}</b></div><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} /></div></div>;
}

function Action({ disease }: { disease: Disease }) {
  const [brief, setBrief] = useState(false);
  const neighbors = edgesFor(disease.id).map((e) => diseaseById(other(e, disease.id))!);
  const allAssets = [...disease.assets, ...neighbors.flatMap((n) => n.assets)];
  const contacts = [...disease.contacts, ...neighbors.flatMap((n) => n.contacts)].slice(0, 4);
  const groupCount = new Map<string, string[]>();
  diseases.forEach((d) => { const names = new Set([d.patientGroup, ...d.assets.map((x) => x.owner)].filter(Boolean) as string[]); names.forEach((n) => groupCount.set(n, [...(groupCount.get(n) ?? []), d.name])); });
  const bridges = [...groupCount.entries()].filter(([, ds]) => ds.length > 1);
  const clusterDiseases = diseases.filter((d) => d.cluster === disease.cluster);
  const registries = clusterDiseases.flatMap((d) => d.assets.filter((x) => x.kind === "registry").map((x) => ({ ...x, d: d.name })));
  const dupOwners = new Set(registries.map((r) => r.owner));
  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-3">
        {[["What you can reuse", allAssets.slice(0, 3).map((x) => x.name)], ["What differs", [`Gene: ${disease.gene} vs ${neighbors[0]?.gene ?? "—"}`, "Age of onset may differ", "Symptom overlap is partial"]], ["Needs expert review", disease.openQuestions]].map(([h, items]) => (
          <div key={h as string} className="rounded-lg border border-border p-5"><h3 className="font-display text-xl">{h}</h3><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{(items as string[]).map((i) => <li key={i}>— {i}</li>)}</ul></div>
        ))}
      </div>
      <section>
        <h3 className="font-display text-2xl">Assets you could build on</h3>
        {allAssets.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No assets found yet. Check the Map tab for nearby communities.</p> : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {allAssets.map((x, i) => <a key={x.name + i} href={x.url} target="_blank" rel="noreferrer" className="lift rounded-lg border border-border p-4"><span className="eyebrow">{x.kind}</span><p className="mt-1 font-semibold">{x.name}</p><p className="text-xs text-muted-foreground">Owner: {x.owner} · source ↗</p></a>)}
          </div>
        )}
        {registries.length > 1 && dupOwners.size > 1 && <p className="mt-4 flex items-start gap-2 rounded-md border border-risk/40 bg-risk/10 p-3 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> Duplicate effort: {registries.length} groups in this cluster each built a registry ({registries.map((r) => r.owner).join(", ")}). Consider pooling.</p>}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section><h3 className="font-display text-2xl">Contacts</h3>
          <ul className="mt-3 space-y-2">{contacts.map((c, i) => <li key={c.name + i} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"><span className="min-w-0"><b>{c.name}</b> <span className="text-muted-foreground">· {c.role} · {c.org}</span></span><a href={c.url} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-primary underline">{c.source}</a></li>)}</ul>
        </section>
        <section><h3 className="font-display text-2xl">Bridges between communities</h3>
          <ul className="mt-3 space-y-2">{bridges.map(([n, ds]) => <li key={n} className="flex gap-2 rounded-md border border-dashed border-primary/60 p-3 text-sm"><Users className="size-4 shrink-0 text-primary" /><span><b>{n}</b> connects {ds.join(" and ")}</span></li>)}</ul>
        </section>
      </div>
      <section>
        <h3 className="font-display text-2xl">Timeline: existing route vs your route</h3>
        <div className="mt-4 space-y-3">
          {[["Build your own natural history study", 36, "bg-muted-foreground/40"], ["Join the existing study as a sub-cohort", 9, "bg-primary"]].map(([l, m, c]) => (
            <div key={l as string}><div className="flex justify-between text-sm"><span>{l}</span><b>{m} months</b></div><div className="mt-1 h-3 rounded-full bg-muted"><div className={`h-full rounded-full ${c}`} style={{ width: `${((m as number) / 36) * 100}%` }} /></div></div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Assumptions: the study owner accepts a new cohort; ethics amendment takes ~3 months; shared outcome measures apply; estimates are illustrative.</p>
      </section>
      <Button onClick={() => setBrief(true)}><FileText className="size-4" /> Generate collaboration brief</Button>
      <BriefDialog disease={disease} open={brief} onOpenChange={setBrief} />
    </div>
  );
}

export function ClusterMap({ current, filterable = true }: { current?: string; filterable?: boolean }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string | "all">("all");
  const centers: Record<string, [number, number]> = { snare: [260, 220], channel: [620, 170], calcium: [600, 400] };
  const pos: Record<string, [number, number]> = {};
  clusters.forEach((c) => { const ds = diseases.filter((d) => d.cluster === c.id); ds.forEach((d, i) => { const ang = (i / ds.length) * Math.PI * 2; const r = ds.length > 1 ? 110 : 0; pos[d.id] = [centers[c.id]![0] + Math.cos(ang) * r, centers[c.id]![1] + Math.sin(ang) * r]; }); });
  const vis = (id: string) => filter === "all" || diseaseById(id)!.cluster === filter;
  return (
    <div>
      {filterable && <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <button onClick={() => setFilter("all")} className={`rounded-full border px-3 py-1 ${filter === "all" ? "border-foreground font-semibold" : "border-border"}`}>All clusters</button>
        {clusters.map((c) => <button key={c.id} onClick={() => setFilter(c.id)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${filter === c.id ? "border-foreground font-semibold" : "border-border"}`}><span className="size-2.5 rounded-full" style={{ background: c.color }} />{c.name}</button>)}
        <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground"><TierLine tier="inferred" className="w-7" /> bridge across clusters</span>
      </div>}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <svg viewBox="0 0 820 560" className="min-w-[640px]" role="img" aria-label="Cluster map of diseases">
          {edges.filter((e) => vis(e.from) && vis(e.to)).map((e) => { const [x1, y1] = pos[e.from]!; const [x2, y2] = pos[e.to]!; const bridge = diseaseById(e.from)!.cluster !== diseaseById(e.to)!.cluster; return <line key={e.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--foreground)" strokeOpacity={0.45} strokeWidth={1.6} strokeDasharray={bridge || e.tier === "inferred" ? "6 5" : undefined} />; })}
          {diseases.filter((d) => vis(d.id)).map((d) => { const [x, y] = pos[d.id]!; const c = clusters.find((k) => k.id === d.cluster)!; const r = 10 + d.importance * 2.2; return (
            <g key={d.id} className="cursor-pointer" onClick={() => navigate({ to: "/disease/$id", params: { id: d.id } })} tabIndex={0} role="link" aria-label={`Open ${d.name}`} onKeyDown={(ev) => ev.key === "Enter" && navigate({ to: "/disease/$id", params: { id: d.id } })}>
              <circle cx={x} cy={y} r={r} fill={c.color} fillOpacity={0.85} stroke={d.id === current ? "var(--foreground)" : "var(--background)"} strokeWidth={d.id === current ? 4 : 2} />
              <text x={x} y={y + r + 15} textAnchor="middle" fontSize="13" fill="var(--foreground)" fontWeight={d.id === current ? 700 : 500}>{d.gene}</text>
            </g>); })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Node size = importance (connections and assets). Click a node to open that disease.</p>
    </div>
  );
}

function EvidenceTable({ disease }: { disease: Disease }) {
  const open = useEvidenceDrawer();
  const [tier, setTier] = useState<Tier | "all">("all");
  const [src, setSrc] = useState("all");
  const rows = edgesFor(disease.id).filter((e) => (tier === "all" || e.tier === tier) && (src === "all" || e.source === src));
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <select value={tier} onChange={(e) => setTier(e.target.value as Tier | "all")} className="h-9 rounded-full border border-border bg-background px-3" aria-label="Filter by tier"><option value="all">All tiers</option><option value="observed">Observed</option><option value="reported">Reported</option><option value="inferred">Inferred</option></select>
        <select value={src} onChange={(e) => setSrc(e.target.value)} className="h-9 rounded-full border border-border bg-background px-3" aria-label="Filter by source"><option value="all">All sources</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </div>
      {rows.length === 0 ? <StateMessage kind="empty" title="No connections match these filters">Clear a filter to see more evidence.</StateMessage> : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-left text-xs text-muted-foreground"><tr>{["Connection", "Type", "Tier", "Source", "Date", "Confidence"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{rows.map((e) => <tr key={e.id} onClick={() => open(e)} className="cursor-pointer border-t border-border hover:bg-surface"><td className="px-4 py-3">{diseaseById(other(e, disease.id))!.name}</td><td className="px-4 py-3">{e.type}</td><td className="px-4 py-3"><TierBadge tier={e.tier} /></td><td className="px-4 py-3">{sourceById(e.source).name}</td><td className="px-4 py-3">{e.retrieved}</td><td className="px-4 py-3 font-semibold">{e.confidence.toFixed(2)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NoRoute({ q, disease }: { q: string; disease: Disease | null }) {
  const near = disease ? edgesFor(disease.id).map((e) => ({ e, d: diseaseById(other(e, disease.id))! })) : [];
  const closest = (near.length ? near.map((n) => ({ d: n.d, why: n.e.sentence })) : [{ d: diseaseById("stxbp1")!, why: "Largest SNARE-gene community with shared epilepsy outcomes." }, { d: diseaseById("snap25")!, why: "Same vesicle-fusion pathway; runs a registry." }]).filter((x) => x.d.patientGroup).slice(0, 2);
  const fallback = closest.length ? closest : [{ d: diseaseById("stxbp1")!, why: "Shares the SNARE pathway." }, { d: diseaseById("snap25")!, why: "Same complex; existing registry." }];
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      <p className="font-sketch text-2xl text-primary">an honest answer</p>
      <h1 className="mt-1 font-display text-4xl md:text-5xl">No supported route for {disease?.name ?? `“${q}”`} yet.</h1>
      <p className="mt-4 text-muted-foreground">We found no patient group or shared asset for this diagnosis.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border p-5"><h2 className="font-display text-xl">What we searched</h2><p className="mt-1 text-sm text-muted-foreground">Query: “{q || disease?.name}”</p><ul className="mt-2 space-y-1 text-sm">{sources.map((s) => <li key={s.id}>{s.name} <span className="text-muted-foreground">· pulled {s.pulled}</span></li>)}</ul></div>
        <div className="rounded-lg border border-border p-5"><h2 className="font-display text-xl">Two closest communities</h2><ul className="mt-2 space-y-3 text-sm">{fallback.map(({ d, why }) => <li key={d.id}><Link to="/disease/$id" params={{ id: d.id }} className="font-semibold text-primary underline">{d.patientGroup}</Link> ({d.name})<p className="text-muted-foreground">{why}</p></li>)}</ul></div>
        <div className="rounded-lg border border-border p-5"><h2 className="font-display text-xl">What would change the answer</h2><ul className="mt-2 space-y-1 text-sm text-muted-foreground"><li>— A published case series with 5+ patients</li><li>— A functional study confirming the shared mechanism</li><li>— A registry listing this diagnosis</li></ul></div>
        <div className="rounded-lg border border-dashed border-primary p-5"><h2 className="font-display text-xl">Help build the missing group</h2><p className="mt-2 text-sm text-muted-foreground">Contact the closest community above and ask whether they would host a sub-group. Many rare disease foundations started as a single family email.</p></div>
      </div>
      <Button asChild className="mt-8"><Link to="/">Try another search</Link></Button>
    </div>
  );
}
