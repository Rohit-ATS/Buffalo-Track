import * as React from "react";
import { FileText, Copy, Check, Download, Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * An editable outreach template, not a generator.
 *
 * This used to claim "Powered by OpenAI (GPT-4o)," have a "Re-generate"
 * button that only ran a 600ms spinner over the same fixed string, and a
 * "Send to Study PI" button that copied text and showed an alert claiming it
 * had been sent. None of that was true: there is no model call anywhere in
 * this component, nothing here is ever transmitted, and the three tones
 * below are fixed strings keyed by `tone`, not a generation of anything.
 *
 * What it actually is: three pre-written drafts a person can copy, download,
 * or open in their own mail client, with every made-up-looking specific
 * (an enrollment count, a trial id) replaced by a bracketed placeholder they
 * have to fill in themselves -- so nothing fabricated can leave this screen
 * by accident.
 */
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
  const [tone, setTone] = React.useState<"formal" | "family" | "scientific">("formal");
  const [reviewed, setReviewed] = React.useState(false);

  if (!isOpen) return null;

  const letters = {
    formal: `Dear [Investigator name] and ${targetName},

I am writing on behalf of our patient community navigating ${disease}. Through the Rare Disease Atlas, we identified that our cohort shares the ${sharedPathway} pathway with the disorders described in your study ([confirm the correct ClinicalTrials.gov NCT ID before sending]).

RATIONALE FOR COLLABORATION:
1. Mechanistic convergence: both cohorts carry loss-of-function variants in presynaptic vesicle release machinery (STXBP1, STX1B, and SNAP25), with closely related seizure and motor-delay phenotypes.
2. Reusable infrastructure: we would like to discuss extending your existing natural history study protocol and IRB documentation to our patient group, rather than starting a separate study.
3. Enrollment readiness: [add your own count of families ready for remote phenotypic tracking here -- do not reuse a number you have not confirmed].

We would welcome a brief introductory meeting with your team and ${partnerOrg} to discuss protocol compatibility and cohort inclusion.

Respectfully,
[Your name], ${partnerOrg}
Evidence dossier: [link to the specific disease page you are citing]`,

    family: `Hi everyone,

An update from the Atlas: our child's diagnosis shares a biological pathway (${sharedPathway}) with another community that already has an active natural history study and patient registry.

Instead of starting our own study from zero, there may be an opportunity to join forces with ${partnerOrg} and their clinical team -- we have not confirmed this yet, which is why we are reaching out.

What this could mean, if they're open to it:
- An existing, experienced research team who already understands this biology.
- A concrete next step: a short introductory call.

[Add what you actually know is true here -- timeline, who is coordinating, what families need to do next.]`,

    scientific: `MEMORANDUM: Mechanistic convergence & possible clinical asset reuse
To: [Recipient], Clinical Research Team
Subject: Possible cohort collaboration -- ${sharedPathway}
References: [list the specific papers/records you are citing -- do not send without them]

SUMMARY:
${disease} and related disorders along the ${sharedPathway} pathway may share enough mechanistic and phenotypic overlap to be worth discussing as a combined or adjacent cohort. This has not been independently reviewed.

PROPOSED DISCUSSION POINTS:
- Whether a secondary cohort arm for confirmed pathogenic loss-of-function variants along this pathway is appropriate.
- Whether existing seizure-frequency or developmental endpoints could be shared across cohorts.
- What preclinical or mechanistic evidence would need review before any protocol change.

Contact: [Your name and affiliation]`,
  };

  const subject = `Possible collaboration: ${sharedPathway} cohort (${disease})`;
  const body = letters[tone];

  const handleCopy = () => {
    void navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${disease.replace(/\s+/g, "-").toLowerCase()}-outreach-draft.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-background p-6 md:p-8 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
              <FileText className="size-3.5" />
              Editable template · not AI-generated · nothing here is sent automatically
            </div>
            <h2 className="font-display text-2xl text-foreground">
              Editable evidence-based outreach template
            </h2>
            <p className="text-xs text-muted-foreground">
              A starting draft for reaching out to{" "}
              <strong className="text-foreground">{targetName}</strong>. Every bracketed placeholder
              needs your own, checked information before this goes anywhere.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-full">
            Close
          </Button>
        </div>

        {/* Tone Selector */}
        <div className="flex rounded-full border border-border bg-surface p-1 text-xs w-fit">
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

        {/* Draft Box */}
        <div className="relative rounded-2xl border border-border bg-surface p-5 shadow-inner">
          <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap max-h-72 overflow-y-auto pr-2">
            {body}
          </pre>

          <div className="mt-4 flex items-start gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
            <span>
              This is a draft, not medical or clinical guidance. Every bracketed placeholder and
              every specific claim (counts, identifiers, citations) must be filled in and checked by
              a person before this is shared with anyone.
            </span>
          </div>
        </div>

        <label className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
          />
          <span className="text-foreground">
            I have replaced every bracketed placeholder with information I have checked myself, and
            a human has reviewed this draft before it leaves this screen.
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="h-8 rounded-full text-xs"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-primary mr-1" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5 mr-1" /> Copy draft
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="h-8 rounded-full text-xs"
          >
            <Download className="size-3.5 mr-1" /> Download draft
          </Button>
          <Button
            size="sm"
            disabled={!reviewed}
            className="h-8 rounded-full text-xs font-semibold"
            title={reviewed ? undefined : "Check the acknowledgement above first"}
            onClick={() => {
              window.location.href = mailtoHref;
            }}
          >
            <Mail className="size-3.5 mr-1" /> Open email draft
          </Button>
        </div>
      </div>
    </div>
  );
}
