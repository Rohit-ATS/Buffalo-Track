import { ArrowRight, Check, Database, FileText, Loader2, SearchX } from "lucide-react";
import type { ReactNode } from "react";

import type { AtlasConnection, AtlasSearchResult } from "@/lib/atlas";
import { Squiggle, Underline } from "@/components/sketches";

function Shell({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <section
      id="atlas-results"
      aria-live="polite"
      className="mx-auto mt-14 max-w-[1440px] scroll-mt-6 px-5 md:px-8"
    >
      <span className="section-tag">{tag}</span>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[6px] border border-border bg-surface p-6 md:p-8">
      <h3 className="font-display text-3xl leading-tight md:text-4xl">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function confidenceLabel(confidence: number | null): string {
  if (confidence === null) return "unscored";
  return `${Math.round(confidence * 100)}% confidence`;
}

function ConnectionRow({ connection }: { connection: AtlasConnection }) {
  const arrow = connection.direction === "outgoing" ? "→" : "←";

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border py-3 last:border-b-0">
      <span className="font-sketch text-xl text-primary" aria-hidden="true">
        {arrow}
      </span>
      <span className="font-display text-xl leading-tight">{connection.neighbor.name}</span>
      <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
        {connection.neighbor.type}
      </span>
      <span className="text-xs text-muted-foreground">
        via <span className="font-semibold text-foreground">{connection.type}</span>
      </span>
      <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        {connection.evidenceCount > 0 ? (
          <>
            <Check className="size-3.5 text-primary" aria-hidden="true" />
            {connection.evidenceCount} receipt{connection.evidenceCount === 1 ? "" : "s"}
          </>
        ) : (
          <>
            <SearchX className="size-3.5" aria-hidden="true" />
            reviewer evidence
          </>
        )}
      </span>
    </li>
  );
}

export function AtlasResults({
  result,
  isPending,
}: {
  result: AtlasSearchResult | undefined;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <Shell tag="Tracing the evidence">
        <div className="flex items-center gap-3 rounded-[6px] border border-border bg-surface p-6 text-muted-foreground md:p-8">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          <span className="font-sketch text-xl">following the biology…</span>
        </div>
      </Shell>
    );
  }

  if (!result) return null;

  if (result.status === "unconfigured") {
    return (
      <Shell tag="Live atlas not connected">
        <Note
          title="The curated sample path below still works."
          body="This build has no BACKEND_URL, so searches cannot reach the graph. Deploy the FastAPI service, apply the migration in supabase/migrations, load supabase/seed.sql, and set BACKEND_URL in frontend/.env. The same search will then return live nodes, edges, and evidence."
        />
      </Shell>
    );
  }

  if (result.status === "error") {
    return (
      <Shell tag="The atlas could not answer">
        <Note title="That search hit a database error." body={result.message} />
      </Shell>
    );
  }

  if (result.status === "empty") {
    return (
      <Shell tag={`Nothing mapped for ${result.query} yet`}>
        <Note
          title="An honest gap, not a guess."
          body="The atlas would rather show an empty result than invent a connection. Try a gene symbol, a mechanism, or a disorder name that is already in the graph."
        />
      </Shell>
    );
  }

  const { match, alsoMatched: rawAlsoMatched } = result;
  const alsoMatched = rawAlsoMatched ?? [];
  const withEvidence = match.connections.filter((c) => c.evidenceCount > 0).length;

  return (
    <Shell tag={`Live result · ${match.connections.length} connections from the graph`}>
      <div className="grid gap-px overflow-hidden rounded-[6px] border border-border bg-border lg:grid-cols-[1.15fr_.85fr]">
        <div className="bg-background p-6 md:p-8">
          <p className="eyebrow">{match.node.type}</p>
          <h3 className="relative mt-2 inline-block font-display text-4xl leading-none md:text-6xl">
            {match.node.name}
            <Underline className="absolute -bottom-3 left-0 h-4 w-full text-primary" />
          </h3>

          {match.connections.length > 0 ? (
            <>
              <p className="mt-10 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <Database className="size-3.5" aria-hidden="true" /> Shares biology with
              </p>
              <ul className="mt-2">
                {match.connections.map((connection) => (
                  <ConnectionRow key={connection.edgeId} connection={connection} />
                ))}
              </ul>
              <p className="mt-5 flex items-center gap-3 font-sketch text-lg text-muted-foreground">
                <Squiggle className="w-20 text-primary" aria-hidden="true" />
                {withEvidence > 0
                  ? `${withEvidence} of ${match.connections.length} carry a receipt`
                  : "Evidence receipts require reviewer access"}
              </p>
            </>
          ) : (
            <p className="mt-8 max-w-md text-sm leading-relaxed text-muted-foreground">
              This node is in the atlas but has no edges yet — a mapped entity waiting on evidence.
            </p>
          )}
        </div>

        <div className="bg-surface p-6 md:p-8">
          <p className="eyebrow flex items-center gap-2">
            <FileText className="size-3.5" aria-hidden="true" /> Evidence receipts
          </p>
          {match.evidence.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {match.evidence.map((item) => (
                <li key={item.id} className="border-l-2 border-primary pl-4">
                  <p className="text-sm leading-relaxed">{item.content}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase text-muted-foreground">
                    <span>{confidenceLabel(item.confidence)}</span>
                    {item.sourceUrl && (
                      <a
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        source <ArrowRight className="size-3" aria-hidden="true" />
                      </a>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Evidence receipts are available to authorized reviewers.
            </p>
          )}

          {alsoMatched.length > 0 && (
            <>
              <p className="eyebrow mt-8">Also matched</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {alsoMatched.map((node) => (
                  <li key={node.id} className="rounded-full border border-border px-3 py-1 text-xs">
                    {node.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
