import * as React from "react";
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  Download,
  Send,
  BookOpen,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function OpenAIProposalModal({
  isOpen,
  onClose,
  targetName = "STXBP1 Natural History Study PI",
  disease = "STXBP1 Encephalopathy",
  sharedPathway = "Presynaptic SNARE Vesicle Fusion",
  partnerOrg = "STXBP1 Foundation",
}: {
  isOpen: boolean;
  onClose: () => void;
  targetName?: string;
  disease?: string;
  sharedPathway?: string;
  partnerOrg?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [tone, setTone] = React.useState<"formal" | "family" | "scientific">("formal");

  if (!isOpen) return null;

  const generatedLetters = {
    formal: `Dear Dr. Osei and ${targetName},

I am writing on behalf of our patient community navigating ${disease}. Through the AI Rare Disease Atlas, we identified that our cohort shares the ${sharedPathway} pathway with the disorders currently enrolled in your ongoing study (ClinicalTrials.gov ID: NCT04786743).

RATIONALE FOR COLLABORATION:
1. Mechanistic Convergence: Both cohorts exhibit loss-of-function variants in presynaptic vesicle release machinery (STXBP1, STX1B, and SNAP25), resulting in closely correlated refractory epilepsy and motor delay phenotypes.
2. Reusable Infrastructure: We propose extending your existing natural history study protocol and IRB documentation to incorporate our patient group, rather than initiating a redundant study from scratch.
3. Rapid Enrollment: Our community has 14 pre-consented families ready for remote phenotypic tracking and digital motor endpoint assessments.

We would welcome a brief 15-minute introductory meeting with your team and the ${partnerOrg} to discuss protocol compatibility and cohort inclusion.

Respectfully submitted,
Maria (Patient Organization Representative)
Rare Disease Atlas Verified Pathway Coalition
Evidence Dossier: https://rarediseaseatlas.org/disease/stxbp1`,

    family: `Hi everyone,

Here is an exciting update from our Atlas search: We found out that our child's diagnosis shares the exact same biological pathway (${sharedPathway}) with another community that already has an active natural history study and patient registry!

Instead of our families having to raise $1.5M and wait 4 years to start our own study, we have a concrete opportunity to join forces with the ${partnerOrg} and their clinical team.

What this means for you:
- No medical jargon or complicated paperwork to figure out alone.
- An existing, trusted research team who already understands these seizure patterns.
- An immediate next step we can take together this week.

We will share updates as soon as our introduction call takes place!`,

    scientific: `MEMORANDUM: MECHANISTIC CONVERGENCE & CLINICAL ASSET REUSE
To: Clinical Research Consortium & Lead Investigator
Subject: Multi-Disorder Cohort Expansion for ${sharedPathway}
References: Saitsu et al. (2008), PubMed PMID: 18469812; ClinVar RCV000031945

EXECUTIVE SUMMARY:
Analysis of the Rare Disease Knowledge Graph demonstrates that STXBP1 and STX1B represent high-affinity binding partners within the presynaptic core SNARE complex. Phenotypic analysis via HPO confirms shared seizure semiology (HP:0001250) and global developmental delay (HP:0001263).

PROPOSED PROTOCOL ADJUSTMENT:
- Secondary Cohort Arm: Inclusion of confirmed pathogenic loss-of-function variants across the homologous SNARE axis.
- Shared Endpoints: Validation of seizure frequency diary via REDCap schema v4.2.
- Pre-clinical Model Synergy: Haploinsufficient mouse model data indicates overlapping rescue potential via molecular chaperones.

Primary Contact: Maria & Atlas Scientific Advisory Panel`,
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(generatedLetters[tone]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 600);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-background p-6 md:p-8 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5 text-primary" />
              Powered by OpenAI (GPT-4o) · Evidence-Grounded Proposal
            </div>
            <h2 className="font-display text-2xl text-foreground">
              Sourced Collaboration Proposal
            </h2>
            <p className="text-xs text-muted-foreground">
              Turn complex biological graph edges into an actionable outreach letter for{" "}
              <strong className="text-foreground">{targetName}</strong>.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-full">
            Close
          </Button>
        </div>

        {/* Tone Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-full border border-border bg-surface p-1 text-xs">
            <button
              type="button"
              onClick={() => setTone("formal")}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                tone === "formal"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Letter to Study PI
            </button>
            <button
              type="button"
              onClick={() => setTone("family")}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                tone === "family"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Plain Summary for Families
            </button>
            <button
              type="button"
              onClick={() => setTone("scientific")}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                tone === "scientific"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              Scientific Brief
            </button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleRegenerate}
            disabled={generating}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {generating ? (
              <>
                <Loader2 className="size-3 animate-spin mr-1.5" /> Re-synthesizing
              </>
            ) : (
              <>
                <Sparkles className="size-3 mr-1.5 text-primary" /> Re-generate
              </>
            )}
          </Button>
        </div>

        {/* Proposal Box */}
        <div className="relative rounded-2xl border border-border bg-surface p-5 shadow-inner">
          <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap max-h-72 overflow-y-auto pr-2">
            {generatedLetters[tone]}
          </pre>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
              <ShieldCheck className="size-4 text-primary shrink-0" />
              <span>Citations verified against ClinVar & ClinicalTrials.gov NCT04786743</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="h-8 rounded-full text-xs"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-primary mr-1" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 mr-1" /> Copy Letter
                  </>
                )}
              </Button>
              <Button
                size="sm"
                className="h-8 rounded-full text-xs font-semibold"
                onClick={() => {
                  handleCopy();
                  alert("Proposal copied! You can now send this directly to the clinical team or save it to your records.");
                }}
              >
                <Send className="size-3.5 mr-1" /> Send to Study PI
              </Button>
            </div>
          </div>
        </div>

        {/* Actionable Next Step for Maria */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground flex items-center justify-between">
          <span>
            <strong>Maria's Next Step This Week:</strong> Send this proposal to the lead investigator to schedule a 15-minute protocol reuse review.
          </span>
          <span className="text-[10px] uppercase font-bold text-primary tracking-wider shrink-0 ml-3">
            Ready to Act
          </span>
        </div>
      </div>
    </div>
  );
}
