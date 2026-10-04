import * as React from "react";
import { Image, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreatePostBox({
  onPublish,
}: {
  onPublish: (
    body: string,
    tags: string[],
    imageUrl?: string,
    evidenceBadge?: string,
  ) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [showImageInput, setShowImageInput] = React.useState(false);
  const [showEvidenceInput, setShowEvidenceInput] = React.useState(false);
  const [evidenceBadge, setEvidenceBadge] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const TAG_OPTIONS = [
    "#STXBP1",
    "#CaregiverWin",
    "#SeizureTracking",
    "#SNAREPathway",
    "#ClinicalTrial",
    "#DailyRoutine",
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setIsSubmitting(true);
    try {
      await onPublish(
        body.trim(),
        selectedTags,
        imageUrl.trim() || undefined,
        evidenceBadge.trim() || undefined,
      );
      setBody("");
      setImageUrl("");
      setEvidenceBadge("");
      setSelectedTags([]);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="size-10 overflow-hidden rounded-full border border-primary/20 bg-primary/10 grid place-items-center font-display font-semibold text-primary">
          YOU
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-left text-xs text-muted-foreground hover:border-primary/50 hover:bg-secondary/50 transition-colors"
        >
          Share an update, milestone, or question with your connected circle…
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 pt-3 border-t border-border/70">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your experience, question, or daily win for your connected peers…"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background p-3 text-xs outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />

          {/* Quick Tag Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground mr-1">Tags:</span>
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Optional Attachments Inputs */}
          {showImageInput && (
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste image URL (e.g. photo of milestone chart, AAC device)…"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
          )}

          {showEvidenceInput && (
            <input
              type="text"
              value={evidenceBadge}
              onChange={(e) => setEvidenceBadge(e.target.value)}
              placeholder="Attach reviewed evidence title (e.g. ClinicalTrials.gov NCT04870502)…"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowImageInput(!showImageInput)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Image className="size-3.5" /> Photo
              </button>
              <button
                type="button"
                onClick={() => setShowEvidenceInput(!showEvidenceInput)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <ShieldCheck className="size-3.5" /> Evidence Card
              </button>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-2">
                <Lock className="size-3" /> Connected Circle Only
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!body.trim() || isSubmitting}
                className="rounded-full text-xs h-8 px-4"
              >
                Post
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
