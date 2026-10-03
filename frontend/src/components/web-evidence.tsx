import { ArrowUpRight, BadgeCheck, Clock, Radio, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import {
  freshnessLabel,
  type DiscoveredAsset,
  type ExtractionQuality,
  type WebEvidence,
} from "@/lib/atlas-web-evidence";

/**
 * Makes the discovery layer visible.
 *
 * The point of these components is that a judge can tell the difference
 * between "the model knows this" and "this page says this, here is the
 * sentence, here is when we read it". So a quote is always shown verbatim with
 * its source link and retrieval time, and a rejected claim shows why it was
 * rejected rather than being hidden.
 */

function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "ok" | "bad" | "neutral";
}) {
  const styles = {
    ok: "border-primary text-primary",
    bad: "border-destructive text-destructive",
    neutral: "border-border text-muted-foreground",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase ${styles}`}
    >
      {children}
    </span>
  );
}

/** "Updated 3 hours ago", with the exact timestamp on hover. */
export function FreshnessBadge({ retrievedAt }: { retrievedAt: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
      title={new Date(retrievedAt).toLocaleString()}
    >
      <Clock className="size-3" aria-hidden="true" />
      Updated {freshnessLabel(retrievedAt)}
    </span>
  );
}

/** One claim, with the sentence it rests on. */
export function WebEvidenceRow({ evidence }: { evidence: WebEvidence }) {
  const verified = evidence.status === "verified";

  return (
    <li className="border-l-2 border-border pl-4 [&+&]:mt-4">
      <div className="flex flex-wrap items-center gap-2">
        {verified ? (
          <Chip tone="ok">
            <BadgeCheck className="size-3" aria-hidden="true" /> Quote verified
          </Chip>
        ) : (
          <Chip tone="bad">
            <ShieldAlert className="size-3" aria-hidden="true" /> {evidence.status}
          </Chip>
        )}
        <span className="text-sm">
          <strong>{evidence.subjectName}</strong> {evidence.predicate}{" "}
          <strong>{evidence.objectName}</strong>
        </span>
      </div>

      <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 text-sm italic leading-relaxed">
        “{evidence.quote}”
      </blockquote>

      {evidence.rejectReason && (
        <p className="mt-2 text-xs text-destructive">{evidence.rejectReason}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {evidence.confidence !== null && (
          // The rule is the answer to "why that number?", so it is always attached.
          <span title={evidence.rule ?? undefined}>
            Confidence {evidence.confidence.toFixed(2)}
            {evidence.rule ? " — why?" : ""}
          </span>
        )}
        {evidence.source && (
          <>
            <FreshnessBadge retrievedAt={evidence.source.retrievedAt} />
            <a
              className="inline-flex items-center gap-1 text-primary hover:underline"
              href={evidence.source.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              {evidence.source.domain} <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
          </>
        )}
        {evidence.model && <span>via {evidence.model}</span>}
      </div>
    </li>
  );
}

/** A discovered asset: what exists, who owns it, and the proof. */
export function DiscoveredAssetCard({ asset }: { asset: DiscoveredAsset }) {
  return (
    <article className="rounded-[6px] border border-border bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chip>{asset.kind}</Chip>
        {asset.source && <FreshnessBadge retrievedAt={asset.source.retrievedAt} />}
      </div>

      <h3 className="mt-3 font-display text-2xl leading-tight">{asset.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Operated by <strong className="text-foreground">{asset.owner}</strong>
        {asset.participants !== null && ` · ${asset.participants} participants`}
      </p>

      {asset.eligibility && (
        <p className="mt-3 text-sm">
          <span className="eyebrow">Eligibility</span>
          <br />
          {asset.eligibility}
        </p>
      )}
      {asset.investigator && (
        <p className="mt-2 text-sm text-muted-foreground">Led by {asset.investigator}</p>
      )}
      {asset.reusableBecause && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {asset.reusableBecause}
        </p>
      )}

      {asset.evidence && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase text-primary">
            Verify on web
          </summary>
          <ul className="mt-3">
            <WebEvidenceRow evidence={asset.evidence} />
          </ul>
        </details>
      )}
    </article>
  );
}

/** The rejection rate, stated plainly. */
export function ExtractionQualityPanel({ quality }: { quality: ExtractionQuality | null }) {
  if (!quality || quality.claimsTotal === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No extraction run yet, so there is no rejection rate to report. An unmeasured rate is not a
        perfect one.
      </p>
    );
  }

  const rate = quality.rejectionRate;
  return (
    <dl className="grid gap-4 sm:grid-cols-4">
      {[
        ["Claims extracted", String(quality.claimsTotal)],
        ["Quote verified", String(quality.verified)],
        ["Rejected", String(quality.rejected)],
        ["Rejection rate", rate === null ? "not measured" : `${Math.round(rate * 100)}%`],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="eyebrow">{label}</dt>
          <dd className="mt-1 font-display text-3xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Shows a run in progress, driven by the realtime subscription. */
export function DiscoveryLiveBadge({ running, count }: { running: boolean; count: number }) {
  if (!running && count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase text-primary">
      <Radio className={`size-3 ${running ? "node-pulse" : ""}`} aria-hidden="true" />
      {running ? "Discovery running" : `${count} discovered`}
    </span>
  );
}
