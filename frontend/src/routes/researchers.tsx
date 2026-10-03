import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { AtlasShell, StateMessage } from "@/components/atlas-ui";
import { Button } from "@/components/ui/button";
import { diseases, researchers } from "@/lib/atlas-data";

const SITE = "https://gleam-artistic-page.lovable.app";
export const Route = createFileRoute("/researchers")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [{ title: "Who shares my mechanism — Rare Disease Atlas" }, { name: "description", content: "Enter a gene and find researchers working on the same mechanism under other gene names." }, { property: "og:title", content: "Who shares my mechanism — Rare Disease Atlas" }, { property: "og:description", content: "Find researchers studying your mechanism under a different gene name." }, { property: "og:type", content: "website" }, { property: "og:url", content: `${SITE}/researchers` }, { name: "twitter:card", content: "summary" }],
    links: [{ rel: "canonical", href: `${SITE}/researchers` }],
  }),
  component: Researchers,
});

function Researchers() {
  const [input, setInput] = useState("STXBP1");
  const [gene, setGene] = useState("STXBP1");
  const d = diseases.find((x) => x.gene.toLowerCase() === gene.trim().toLowerCase());
  const list = d ? researchers.filter((r) => r.mechanism === d.pathway && r.gene !== d.gene) : [];
  return (
    <AtlasShell>
      <div className="mx-auto max-w-[1100px] px-4 py-10 md:px-8">
        <p className="font-sketch text-2xl text-primary">Dr. Osei's view</p>
        <h1 className="font-display text-4xl md:text-5xl">Who shares my mechanism?</h1>
        <form onSubmit={(e) => { e.preventDefault(); setGene(input); }} className="mt-6 flex max-w-md gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm" placeholder="Enter a gene, e.g. STXBP1" aria-label="Gene" />
          <Button type="submit">Find researchers</Button>
        </form>
        {!d ? <StateMessage kind="empty" title={`We don't know “${gene}” yet`}>Try STXBP1, SNAP25, SYT1, KCNQ2, or SCN2A.</StateMessage>
          : list.length === 0 ? <StateMessage kind="empty" title="No one else found on this mechanism">Check back after the next data pull, or search a neighbouring gene.</StateMessage> : (
          <>
            <p className="mt-6 text-sm text-muted-foreground">Working on <b>{d.pathway.toLowerCase()}</b> under other gene names:</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {list.map((r) => (
                <article key={r.name} className="lift rounded-lg border border-border p-5">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-display text-2xl">{r.name}</h2><p className="text-sm text-muted-foreground">{r.institution}</p></div><span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-semibold">{r.gene}</span></div>
                  <h3 className="mt-4 eyebrow">Papers</h3><ul className="text-sm">{r.papers.map((p) => <li key={p.title}><a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">{p.title} <ExternalLink className="size-3" /></a></li>)}</ul>
                  <h3 className="mt-3 eyebrow">Trials</h3><ul className="text-sm">{r.trials.length ? r.trials.map((t) => <li key={t.title}><a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">{t.title} <ExternalLink className="size-3" /></a></li>) : <li className="text-muted-foreground">None listed</li>}</ul>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </AtlasShell>
  );
}
