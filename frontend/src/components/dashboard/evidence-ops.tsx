import { Loader2 } from "lucide-react";
import * as React from "react";

import { ExtractionQualityPanel } from "@/components/web-evidence";
import { atlasCoverage } from "@/lib/atlas-live";
import { webQuality, webRuns } from "@/lib/atlas-web-live";
import type { Coverage, Metric } from "@/lib/atlas-schema";
import type { DiscoveryRun, ExtractionQuality } from "@/lib/atlas-web-evidence";

/**
 * The reviewer and admin sections.
 *
 * Both read live numbers and say so when a number has not been measured. The
 * temptation in a dashboard is to fill every tile; a blank that explains itself
 * is worth more here than a plausible figure, because the whole product is an
 * argument about traceable evidence.
 */

function Panel({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-3xl leading-tight">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{blurb}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    load()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load this section.");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, error };
}

export function EvidenceSection() {
  const quality = useLoad<ExtractionQuality | null>(() => webQuality());
  const runs = useLoad<DiscoveryRun[]>(() => webRuns());

  return (
    <Panel
      title="Evidence review"
      blurb="Claims extracted from the web, and whether their quote was found in the page it came from. A claim that cannot be traced back is rejected, not softened."
    >
      {quality.error && <p className="text-sm text-destructive">{quality.error}</p>}
      <ExtractionQualityPanel quality={quality.data ?? null} />

      <h3 className="eyebrow mt-10">Discovery runs</h3>
      {runs.data === null && !runs.error && (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…
        </p>
      )}
      {runs.error && <p className="mt-2 text-sm text-destructive">{runs.error}</p>}
      {runs.data?.length === 0 && (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          No run yet. Discovery is a pipeline step, not something a page view triggers — that is
          what keeps a visit free and instant. Run it from the backend and results appear here live.
        </p>
      )}
      <ul className="mt-3 grid gap-2">
        {(runs.data ?? []).map((run) => (
          <li key={run.id} className="rounded-[6px] border border-border p-3 text-sm">
            <strong>{run.seedTerm}</strong> — {run.claimsVerified} verified / {run.claimsRejected}{" "}
            rejected of {run.claimsExtracted} extracted
            <span className="ml-2 text-[11px] uppercase text-muted-foreground">
              {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "running"}
            </span>
            {run.notes && <p className="mt-1 text-xs text-muted-foreground">{run.notes}</p>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function OperationsSection() {
  const atlas = useLoad<{ coverage: Coverage | null; metrics: Metric[] }>(() =>
    atlasCoverage().then((r) => ({ coverage: r.coverage, metrics: r.metrics })),
  );

  const coverage = atlas.data?.coverage ?? null;

  return (
    <Panel
      title="Operations"
      blurb="What the atlas actually holds, and where it came from. Every number here is counted from the database, not estimated."
    >
      {atlas.error && <p className="text-sm text-destructive">{atlas.error}</p>}
      {!coverage && !atlas.error && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…
        </p>
      )}

      {coverage && (
        <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(
            [
              ["Mechanism units", coverage.mechanismUnits],
              ["Genes", coverage.genes],
              ["Phenotypes", coverage.phenotypes],
              ["Connections", coverage.connections],
              ["Observed", coverage.observedEdges],
              ["Reported", coverage.reportedEdges],
              ["Inferred", coverage.inferredEdges],
              ["Organizations", coverage.organizations],
              ["Assets", coverage.assets],
              ["Studies", coverage.trials],
              ["Researchers", coverage.researchers],
              ["Clusters", coverage.clusters],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="eyebrow">{label}</dt>
              <dd className="mt-1 font-display text-3xl">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {coverage?.lastPulled && (
        <p className="mt-6 text-xs text-muted-foreground">
          Newest source pull: {coverage.lastPulled}
        </p>
      )}

      <h3 className="eyebrow mt-10">Quality</h3>
      <ul className="mt-3 grid gap-2">
        {(atlas.data?.metrics ?? []).map((metric) => (
          <li key={metric.key} className="rounded-[6px] border border-border p-3 text-sm">
            <strong>{metric.label}</strong>: {metric.value}
            {metric.detail && (
              <span className="ml-2 text-xs text-muted-foreground">{metric.detail}</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
