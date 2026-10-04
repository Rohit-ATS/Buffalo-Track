import * as React from "react";
import {
  Sparkles,
  Clock,
  TrendingUp,
  CheckCircle2,
  Share2,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MoonshotMetric {
  title: string;
  traditionalTime: string;
  atlasTime: string;
  traditionalCost: string;
  atlasCost: string;
  speedup: string;
  assumption: string;
}

export function MoonshotAcceleratorModal({
  isOpen,
  onClose,
  diseaseName = "STXBP1 Encephalopathy",
}: {
  isOpen: boolean;
  onClose: () => void;
  diseaseName?: string;
}) {
  const [selectedMilestone, setSelectedMilestone] = React.useState<number>(0);

  if (!isOpen) return null;

  const milestones: MoonshotMetric[] = [
    {
      title: "Shared Natural History Study & Protocol Launch",
      traditionalTime: "4.5 Years",
      atlasTime: "4 Months",
      traditionalCost: "$1.8M",
      atlasCost: "$180,000",
      speedup: "13.5×",
      assumption:
        "Reusing STXBP1 Foundation's reviewed IRB protocol and common presynaptic seizure clinical endpoints across related SNARE disorders (STX1B & SNAP25) without re-negotiating multi-site trial governance from scratch.",
    },
    {
      title: "Patient Registry & Longitudinal Phenotyping",
      traditionalTime: "3.2 Years",
      atlasTime: "3 Months",
      traditionalCost: "$850,000",
      atlasCost: "$65,000",
      speedup: "12.8×",
      assumption:
        "Deploying pre-configured HPO (Human Phenotype Ontology) forms and REDCap data dictionary licensed from the existing rare epilepsy registry, pooling consent cohorts immediately.",
    },
    {
      title: "Drug Repurposing & Mechanism-Matched Target Validation",
      traditionalTime: "6.0 Years",
      atlasTime: "7 Months",
      traditionalCost: "$4.5M",
      atlasCost: "$420,000",
      speedup: "10.2×",
      assumption:
        "Grouping by loss-of-function SNARE vesicle docking instead of disease label allows repurposing pharmacological chaperone candidates already tested on synaptic transmission pathways.",
    },
  ];

  const current = milestones[selectedMilestone] ?? milestones[0];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-background p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Sparkles className="size-3.5" />
              Illustrative example, not a published benchmark
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-foreground">
              What sharing a mechanism could save
            </h2>
            <p className="text-xs text-muted-foreground">
              A hypothetical comparison -- siloed single-disease research vs. an atlas
              shared-mechanism model -- for{" "}
              <strong className="text-foreground">{diseaseName}</strong>. The figures below are
              scenario assumptions this demo made up to illustrate the idea, not measurements of any
              real program.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-full">
            Close
          </Button>
        </div>

        {/* Milestone Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {milestones.map((m, idx) => (
            <button
              key={m.title}
              type="button"
              onClick={() => setSelectedMilestone(idx)}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                selectedMilestone === idx
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border hover:bg-surface text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Milestone 0{idx + 1}
                </span>
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {m.speedup}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-foreground line-clamp-2">{m.title}</p>
            </button>
          ))}
        </div>

        {/* Comparison Hero Card */}
        <div className="grid gap-6 md:grid-cols-2 rounded-2xl border border-border bg-surface p-6">
          {/* Traditional Route */}
          <div className="space-y-4 rounded-xl border border-border/80 bg-background/80 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Traditional Siloed Route
              </span>
              <span className="text-xs text-destructive flex items-center gap-1 font-medium">
                <AlertTriangle className="size-3.5" /> High Duplicate Burden
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">Estimated Time to Milestone</p>
                <p className="text-2xl font-bold font-display text-foreground">
                  {current.traditionalTime}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated Advocacy Cost</p>
                <p className="text-lg font-semibold text-foreground">{current.traditionalCost}</p>
              </div>
              <ul className="space-y-1.5 text-[11px] text-muted-foreground pt-1">
                <li>• Starting patient cohort from zero families</li>
                <li>• Rebuilding legal IRB consent documents</li>
                <li>• Re-inventing custom registry schemas</li>
                <li>• Cold-calling clinical trial investigators</li>
              </ul>
            </div>
          </div>

          {/* Atlas 10x Route */}
          <div className="space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 rounded-bl-xl bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground uppercase">
              10× Moonshot Route
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Atlas Shared-Mechanism Model
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">Accelerated Time to Milestone</p>
                <p className="text-3xl font-extrabold font-display text-primary flex items-baseline gap-2">
                  {current.atlasTime}
                  <span className="text-xs font-semibold text-primary/80">
                    ({current.speedup} faster)
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pooled Community Cost</p>
                <p className="text-lg font-semibold text-primary">{current.atlasCost}</p>
              </div>
              <ul className="space-y-1.5 text-[11px] text-foreground font-medium pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  Cross-licensing open REDCap registry protocols
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  Pooling rare cohorts across SNARE vesicle cluster
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  Sourced outreach proposal ready in 1 click
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Methodology & Assumptions (Strict brief requirement) */}
        <div className="rounded-2xl border border-border/70 bg-background p-4 text-xs space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <TrendingUp className="size-4 text-primary" /> Key Assumptions Behind 10× Acceleration
          </p>
          <p className="text-muted-foreground leading-relaxed text-[11px]">{current.assumption}</p>
          <p className="text-[10px] text-muted-foreground/80 italic pt-1 border-t border-border/50">
            * These timelines, costs, and the "{current.speedup}" figure are scenario assumptions
            written for this demo, not measurements from a real program, a citation, or a published
            benchmark. Treat every number on this screen as illustrative only.
          </p>
        </div>
      </div>
    </div>
  );
}
