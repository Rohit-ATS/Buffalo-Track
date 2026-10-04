import { Loader2 } from "lucide-react";
import * as React from "react";

import { DiscoveredAssetCard, DiscoveryLiveBadge } from "@/components/web-evidence";
import { useRealtimeDiscoveries } from "@/hooks/use-realtime-discoveries";
import type { DiscoveredAsset } from "@/lib/atlas-web-evidence";
import { webAssets } from "@/lib/atlas-web-live";

/**
 * Assets the discovery pipeline found for one mechanism unit, kept current.
 *
 * Two sources, deliberately: the realtime subscription is the *signal* that
 * something landed, and a refetch gets the full record. Realtime rows carry
 * only the asset's own columns, and an asset without its quote, its source and
 * its retrieval time is not evidence — so it would be the wrong thing to render
 * from the payload alone.
 *
 * Nothing here triggers a fetch of the web. A page view reads what a pipeline
 * run already stored, which is why twenty people opening this costs nothing.
 */
export function LiveDiscoveries({ diseaseId }: { diseaseId: string }) {
  const live = useRealtimeDiscoveries(diseaseId);
  const [assets, setAssets] = React.useState<DiscoveredAsset[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Refetch on first load and whenever the subscription says the set changed.
  const signature = live.assets.map((a) => a.id).join(",");

  React.useEffect(() => {
    let cancelled = false;
    // Server functions are unavailable on the static GitHub Pages build. Start
    // the call in a promise so a synchronous client-runtime assertion becomes
    // the same recoverable error as a failed request.
    Promise.resolve()
      .then(() => webAssets({ data: { diseaseId } }))
      .then((rows) => {
        if (!cancelled) setAssets(rows);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load discovered assets.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [diseaseId, signature]);

  const count = assets?.length ?? 0;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="section-tag">Discovered on the web</span>
          <h2 className="mt-3 font-display text-4xl leading-none md:text-5xl">
            What this community already built
          </h2>
        </div>
        <DiscoveryLiveBadge running={live.running} count={count} />
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Found by searching the open web for patient organizations and the research infrastructure
        they own, then keeping only the claims whose quote was found verbatim in the page it came
        from.
      </p>

      {error && <p className="mt-6 text-sm text-destructive">{error}</p>}
      {live.error && <p className="mt-6 text-sm text-destructive">{live.error}</p>}

      {assets === null && !error && (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…
        </p>
      )}

      {assets !== null && assets.length === 0 && (
        <div className="mt-6 rounded-[6px] border border-border bg-surface p-6">
          <p className="font-display text-2xl leading-tight">Nothing discovered here yet.</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {live.status === "unconfigured"
              ? "This build has no browser Supabase credentials, so live updates are off."
              : "Discovery runs from the pipeline, not from this page — that is what keeps a visit instant. Once a run covers this unit, its assets appear here as they land, each with the sentence that proves it."}
          </p>
        </div>
      )}

      {assets !== null && assets.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {assets.map((asset) => (
            <DiscoveredAssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </section>
  );
}
