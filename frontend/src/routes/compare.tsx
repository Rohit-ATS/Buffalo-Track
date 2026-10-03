import { createFileRoute, Link } from "@tanstack/react-router";
import { AtlasShell, CitationChip, StateMessage, TierBadge } from "@/components/atlas-ui";
import { Button } from "@/components/ui/button";
import { clusters, diseaseById, diseases, edges, similarity } from "@/lib/atlas-data";

const SITE = "https://gleam-artistic-page.lovable.app";
export const Route = createFileRoute("/compare")({
  staticData: { sitemap: true },
  validateSearch: (
    s: Record<string, unknown>,
  ): { a?: string | undefined; b?: string | undefined } => ({
    a: typeof s["a"] === "string" ? s["a"] : undefined,
    b: typeof s["b"] === "string" ? s["b"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Why not connected — Rare Disease Atlas" },
      {
        name: "description",
        content:
          "Compare two rare diseases side by side: what they share, what separates them, and the evidence behind the split.",
      },
      { property: "og:title", content: "Why not connected — Rare Disease Atlas" },
      {
        property: "og:description",
        content:
          "Same gene does not always mean same biology. See the evidence behind every split.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/compare` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE}/compare` }],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { a = "cacna1a-ea2", b = "cacna1a-fhm1" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const x = diseaseById(a),
    y = diseaseById(b);
  if (!x || !y)
    return (
      <AtlasShell>
        <StateMessage
          kind="error"
          title="One of these diseases isn't in the atlas"
          action={
            <Button asChild>
              <Link to="/compare">Show the CACNA1A example</Link>
            </Button>
          }
        >
          Pick two diseases from the lists to compare.
        </StateMessage>
      </AtlasShell>
    );
  const sim = similarity(a, b);
  const evidence = edges.filter(
    (e) => (e.from === a && e.to === b) || (e.from === b && e.to === a),
  );
  const shares = [
    x.gene === y.gene && `the ${x.gene} gene`,
    x.name.split(" ")[0] === y.name.split(" ")[0] && "a similar name",
    x.pathway === y.pathway && "the same pathway",
  ].filter(Boolean) as string[];
  const separates = [
    x.mechanism !== y.mechanism && `mechanism (${x.mechanism} vs ${y.mechanism})`,
    x.cluster !== y.cluster && "cluster",
    sim.symptoms < 50 && `symptoms (${sim.symptoms}% overlap)`,
  ].filter(Boolean) as string[];
  const connected = separates.length === 0;
  const verdict = connected
    ? `These two belong together: they share ${shares.join(" and ") || "biology"} and nothing important separates them.`
    : `Not connected: they share ${shares.join(" and ") || "little"}, but differ in ${separates.join(" and ")}, so findings from one shouldn't be assumed for the other.`;
  const pick = (k: "a" | "b", v: string) => navigate({ search: (p) => ({ ...p, a, b, [k]: v }) });
  return (
    <AtlasShell>
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
        <p className="font-sketch text-2xl text-primary">why not connected?</p>
        <h1 className="font-display text-4xl md:text-5xl">Two diseases, side by side</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          {[
            { d: x, k: "a" as const },
            { d: y, k: "b" as const },
          ].map(({ d, k }, i) => (
            <div
              key={k}
              className={`rounded-lg border border-border p-6 ${i === 1 ? "md:order-3" : ""}`}
            >
              <select
                value={d.id}
                onChange={(e) => pick(k, e.target.value)}
                className="h-9 w-full rounded-full border border-border bg-background px-3 text-sm"
                aria-label={`Disease ${k.toUpperCase()}`}
              >
                {diseases.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <h2 className="mt-4 font-display text-2xl">{d.name}</h2>
              <dl className="mt-3 space-y-1 text-sm">
                <div>
                  Gene: <b>{d.gene}</b>
                </div>
                <div className="capitalize">
                  Mechanism: <b>{d.mechanism}</b>
                </div>
                <div>
                  Cluster: <b>{clusters.find((c) => c.id === d.cluster)?.name}</b>
                </div>
                <div>Symptoms: {d.symptoms.join(", ")}</div>
              </dl>
            </div>
          ))}
          <div className="flex items-center justify-center font-display text-6xl text-primary md:order-2 wiggle">
            {connected ? "=" : "≠"}
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border p-5">
            <h3 className="font-display text-xl">What they share</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {shares.length ? shares.join(", ") : "Nothing notable."}
            </p>
          </div>
          <div className="rounded-lg border border-border p-5">
            <h3 className="font-display text-xl">What separates them</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {separates.length ? separates.join(", ") : "Nothing important."} · mechanism score{" "}
              {sim.mechanism}, symptom score {sim.symptoms}
            </p>
          </div>
        </div>
        <section className="mt-6 rounded-lg border border-border p-5">
          <h3 className="font-display text-xl">Evidence behind the split</h3>
          {evidence.length ? (
            evidence.map((e, i) => (
              <p key={e.id} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <TierBadge tier={e.tier} /> {e.sentence}
                <CitationChip edge={e} n={i + 1} />
              </p>
            ))
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No direct sourced connection between these two. The comparison uses their gene,
              mechanism, and symptom annotations.
            </p>
          )}
        </section>
        <p className="mt-8 rounded-lg bg-contrast p-6 font-display text-2xl text-contrast-foreground">
          {verdict}
        </p>
      </div>
    </AtlasShell>
  );
}
