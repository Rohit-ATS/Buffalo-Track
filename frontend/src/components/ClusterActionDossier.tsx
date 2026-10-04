import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  GitMerge,
  ArrowRight,
  Database,
  FileCheck,
  Building2,
  ExternalLink,
  Layers,
  Zap,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataStateBadge } from "@/components/DataStateBadge";

export interface PathwayClusterNode {
  disease: string;
  gene: string;
  mechanism: string;
  hasRegistry: boolean;
  hasTrial: boolean;
  patientGroup: string;
  reusableAsset: string;
}

export function ClusterActionDossier({
  clusterName = "SNARE Vesicle Fusion Cluster",
  primaryDisease = "STXBP1 Encephalopathy",
  onOpenMoonshot,
  onOpenProposal,
}: {
  clusterName?: string;
  primaryDisease?: string;
  onOpenMoonshot: () => void;
  onOpenProposal: () => void;
}) {
  const clusterMembers: PathwayClusterNode[] = [
    {
      disease: "STXBP1 encephalopathy",
      gene: "STXBP1",
      mechanism: "loss-of-function (presynaptic vesicle docking)",
      hasRegistry: true,
      hasTrial: true,
      patientGroup: "STXBP1 Foundation",
      reusableAsset: "Global Registry (REDCap v4.2) + Natural History Study Protocol",
    },
    {
      disease: "STX1B-related epilepsy",
      gene: "STX1B",
      mechanism: "loss-of-function (SNARE complex assembly)",
      hasRegistry: false,
      hasTrial: false,
      patientGroup: "Parent Volunteers (Seeking Circle)",
      reusableAsset: "Can directly adopt STXBP1 seizure diary & digital motor endpoints",
    },
    {
      disease: "SNAP25 encephalopathy",
      gene: "SNAP25",
      mechanism: "loss-of-function (calcium-triggered exocytosis)",
      hasRegistry: true,
      hasTrial: true,
      patientGroup: "SNAP25 Families",
      reusableAsset: "SNARE disorders registry pilot & natural history endpoints",
    },
  ];

  return (
    <div className="rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/5 via-surface to-background p-6 md:p-7 shadow-sm space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
              <GitMerge className="size-3" /> Core Mechanism Cluster
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {clusterName}
            </span>
            {/* These three members and their asset/registry status are the
                same curated sample set as the rest of the atlas (src/lib/atlas-data.ts),
                not a live query -- see DataStateBadge.tsx. */}
            <DataStateBadge state="curated" />
          </div>
          <h2 className="mt-2 font-display text-2xl md:text-3xl text-foreground">
            Who shares our biology & what can we reuse this week?
          </h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Organizing knowledge by <strong>mechanism and phenotype</strong> reveals clinical
            assets, open protocols, and patient cohorts you can share instead of building from
            scratch.
          </p>
        </div>

        {/* Action Buttons for Maria */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenMoonshot}
            className="rounded-full text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 h-8"
          >
            <Zap className="size-3.5 mr-1.5 text-primary" />
            View 10× Moonshot Timeline
          </Button>

          <Button
            size="sm"
            onClick={onOpenProposal}
            className="rounded-full text-xs font-semibold h-8 shadow-xs"
          >
            <Sparkles className="size-3.5 mr-1.5" />
            Open outreach template
          </Button>
        </div>
      </div>

      {/* Cluster Table & Reusable Assets Grid */}
      <div className="grid gap-3.5 md:grid-cols-3">
        {clusterMembers.map((member) => (
          <div
            key={member.gene}
            className={`rounded-2xl border p-4.5 space-y-3 transition-all ${
              member.disease.toLowerCase().includes("stxbp1")
                ? "border-primary/50 bg-background shadow-xs ring-1 ring-primary/20"
                : "border-border bg-surface/70 hover:bg-surface"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground font-mono">
                  Gene: {member.gene}
                </span>
                <h4 className="mt-1.5 font-bold text-sm text-foreground leading-snug">
                  {member.disease}
                </h4>
              </div>
              {member.disease.toLowerCase().includes("stxbp1") && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Your Diagnosis
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
              <strong className="text-foreground">Mechanism:</strong> {member.mechanism}
            </p>

            <div className="rounded-xl border border-border/80 bg-background/90 p-2.5 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <Database className="size-3 text-primary shrink-0" />
                <span>Reusable Asset:</span>
              </div>
              <p className="text-muted-foreground text-[10.5px] leading-tight">
                {member.reusableAsset}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
              <span className="flex items-center gap-1">
                <Building2 className="size-3 text-primary shrink-0" /> {member.patientGroup}
              </span>
              <div className="flex items-center gap-1">
                {member.hasRegistry && (
                  <span className="size-2 rounded-full bg-primary" title="Registry active" />
                )}
                {member.hasTrial && (
                  <span
                    className="size-2 rounded-full bg-highlight"
                    title="Natural history active"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Honest Treatment of Uncertainty (Page 4 requirement) */}
      <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <HelpCircle className="size-4 text-primary shrink-0" />
          <span>
            <strong>What still needs testing before combining cohorts?</strong> Whether seizure
            tracking endpoints validate across both STX1B and STXBP1 phenotypes.
          </span>
        </div>
        <Link
          to="/compare"
          search={{ a: "stxbp1", b: "stx1b" }}
          className="font-semibold text-primary hover:underline text-xs flex items-center gap-1"
        >
          Compare Biology Receipts <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
