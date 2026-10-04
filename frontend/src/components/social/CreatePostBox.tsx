import * as React from "react";
import { Globe2, Image, Loader2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadCircles, type Circle } from "@/lib/social";

/** A post's circle is either a real circle id, or the literal "public" --
 *  this string never reaches the database; see `toCircleId` below. */
const PUBLIC = "public";

export function CreatePostBox({
  onPublish,
}: {
  onPublish: (
    body: string,
    tags: string[],
    imageUrl: string | undefined,
    evidenceBadge: string | undefined,
    circleId: string | null,
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
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Who this post can go to: the circles this account is an *active* member
  // of, plus the always-available public option. Loaded once the composer is
  // actually opened, not on every feed render.
  const [circles, setCircles] = React.useState<Circle[]>([]);
  const [circlesLoading, setCirclesLoading] = React.useState(false);
  const [audience, setAudience] = React.useState<string>(PUBLIC);

  React.useEffect(() => {
    if (!open || circles.length > 0) return;
    setCirclesLoading(true);
    loadCircles()
      .then((all) => {
        const mine = all.filter((c) => c.membership === "active");
        setCircles(mine);
        // Default to a real circle when the person has one: the composer has
        // always told people "Connected Circle Only," so that is the safer
        // default meaning, not a silent broadening to public. Someone with no
        // circle sees only the public option, stated plainly, not implied.
        if (mine.length > 0) setAudience(mine[0]!.id);
      })
      .catch(() => setCircles([]))
      .finally(() => setCirclesLoading(false));
  }, [open, circles.length]);

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
    setSubmitError(null);
    try {
      await onPublish(
        body.trim(),
        selectedTags,
        imageUrl.trim() || undefined,
        evidenceBadge.trim() || undefined,
        audience === PUBLIC ? null : audience,
      );
      setBody("");
      setImageUrl("");
      setEvidenceBadge("");
      setSelectedTags([]);
      setOpen(false);
    } catch (cause) {
      // The draft stays on screen: a write that failed must never look like
      // one that quietly succeeded (that was the previous local-only
      // fallback's mistake).
      setSubmitError(cause instanceof Error ? cause.message : "That post could not be saved.");
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

          {/* Who can read this -- a conscious choice every time, not a default
              the person never saw. Options are exactly the circles the account
              is an active member of, plus the one always-available public
              choice; there is nothing here RLS wouldn't also allow. */}
          <label className="block space-y-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase text-muted-foreground">
              {audience === PUBLIC ? (
                <Globe2 className="size-3" aria-hidden="true" />
              ) : (
                <Lock className="size-3" aria-hidden="true" />
              )}
              Who can see this
            </span>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              disabled={circlesLoading}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
            >
              {circles.map((circle) => (
                <option key={circle.id} value={circle.id}>
                  {circle.name} (circle members only)
                </option>
              ))}
              <option value={PUBLIC}>Public to signed-in community</option>
            </select>
          </label>

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

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
              {circlesLoading && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" /> loading circles…
                </span>
              )}
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
