import { createFileRoute } from "@tanstack/react-router";
import { AtlasShell, EvidenceKey } from "@/components/atlas-ui";
import { diseases, sources } from "@/lib/atlas-data";

const SITE = "https://gleam-artistic-page.lovable.app";
export const Route = createFileRoute("/methods")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Coverage and methods — Rare Disease Atlas" },
      {
        name: "description",
        content:
          "Data sources, coverage, accuracy checks, where AI is used, and the known limits of the Rare Disease Atlas.",
      },
      { property: "og:title", content: "Coverage and methods — Rare Disease Atlas" },
      {
        property: "og:description",
        content: "How every connection in the atlas is sourced, checked, and limited.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${SITE}/methods` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE}/methods` }],
  }),
  component: Methods,
});

const Placeholder = () => (
  <span className="ml-1 rounded bg-highlight/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
    placeholder
  </span>
);

function Methods() {
  const deep = diseases.filter((d) => d.assets.length && d.patientGroup).length;
  return (
    <AtlasShell>
      <div className="mx-auto max-w-[1100px] px-4 py-10 md:px-8">
        <h1 className="font-display text-4xl md:text-5xl">Coverage and methods</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          What the atlas knows, how it knows it, and what it does not claim.
        </p>
        <EvidenceKey className="mt-4" />
        <section className="mt-10">
          <h2 className="font-display text-2xl">Data sources</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-surface text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Source</th>
                  <th className="px-4 py-2.5">Records</th>
                  <th className="px-4 py-2.5">Date pulled</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-primary"
                      >
                        {s.name}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {s.count.toLocaleString()}
                      <Placeholder />
                    </td>
                    <td className="px-4 py-3">{s.pulled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [`${diseases.length - deep} / ${deep}`, "basic layer / deep layer diseases"],
            ["14%", "quote-checker rejection rate"],
            ["46 / 50", "accuracy on the hand-checked connections (92%)"],
            ["0.87", "clustering stability (ARI over reruns)"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-lg border border-border p-5">
              <div className="font-display text-4xl">{n}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {l}
                {l !== "basic layer / deep layer diseases" && <Placeholder />}
              </p>
            </div>
          ))}
        </section>
        <p className="mt-3 text-sm text-muted-foreground">
          Pairs only our method found: STX1B ↔ STXBP1 sub-cohort, SNAP25 ↔ SYT1 registry overlap.{" "}
          <Placeholder />
        </p>
        <section className="mt-10">
          <h2 className="font-display text-2xl">Where OpenAI is used</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Extract", "Pulls claims and exact quotes from papers."],
              ["Reconcile", "Matches synonyms and gene names across sources."],
              ["Explain", "Writes the plain-language sentences under each step."],
              ["Brief", "Drafts the collaboration brief from sourced facts only."],
            ].map(([h, b]) => (
              <div key={h} className="rounded-lg border border-border p-4">
                <h3 className="font-semibold">{h}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Every AI-extracted quote is checked against the source text; failures are rejected.
          </p>
        </section>
        <section className="mt-10 rounded-lg bg-contrast p-6 text-contrast-foreground">
          <h2 className="font-display text-2xl">Known limits and what is not claimed</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>— This is research navigation, not medical advice or a diagnosis.</li>
            <li>— Inferred connections are hypotheses, not findings.</li>
            <li>— Coverage is limited to the sources listed above and their pull dates.</li>
            <li>— Timelines and similarity scores are estimates.</li>
            <li>— Absence of a connection does not mean none exists.</li>
          </ul>
        </section>
      </div>
    </AtlasShell>
  );
}
