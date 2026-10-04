import * as React from "react";
import { BookOpen, Check, HeartHandshake, Lock, Search, ShieldCheck, Sparkles, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  acceptIntroduction,
  joinCircle,
  sendIntroduction,
  type FamilySuggestion,
} from "@/lib/family-network";

export function ExploreView({
  suggestions,
  onOpenEvidence,
}: {
  suggestions: FamilySuggestion[];
  onOpenEvidence: (s: FamilySuggestion) => void;
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [requestModal, setRequestModal] = React.useState<FamilySuggestion | null>(null);
  const [requestNote, setRequestNote] = React.useState("I’d appreciate learning how other families approach seizure tracking and daily routines.");
  const [statusNotice, setStatusNotice] = React.useState<string | null>(null);
  const [joinedCircleIds, setJoinedCircleIds] = React.useState<string[]>([]);
  const [sentRequestIds, setSentRequestIds] = React.useState<string[]>([]);

  const handleJoinCircle = async (item: FamilySuggestion) => {
    if (!item.target_circle_id) return;
    try {
      await joinCircle(item.target_circle_id);
      setJoinedCircleIds((prev) => [...prev, item.id]);
      setStatusNotice(`Join request sent privately to ${item.title} steward.`);
    } catch {
      setStatusNotice("That request could not be sent.");
    }
  };

  const handleSendIntro = async () => {
    if (!requestModal || !requestModal.target_profile_id) return;
    try {
      await sendIntroduction(requestModal.target_profile_id, requestNote);
      setSentRequestIds((prev) => [...prev, requestModal.id]);
      setStatusNotice(`Introduction request sent. Your contact details remain private.`);
      setRequestModal(null);
    } catch {
      setStatusNotice("Could not send introduction request.");
    }
  };

  const filtered = suggestions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.detail.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by gene, condition (e.g. STXBP1, CACNA1A), life stage, or resource…"
          className="w-full rounded-2xl border border-border bg-surface py-3.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      {statusNotice && (
        <div className="rounded-xl border border-primary/30 bg-example-mint p-3 text-xs text-foreground flex items-center justify-between">
          <span>{statusNotice}</span>
          <button onClick={() => setStatusNotice(null)} className="font-semibold text-primary">
            Dismiss
          </button>
        </div>
      )}

      {/* Suggested Matches Section */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-2xl">Atlas Explainable Connections</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connections suggested based on verified shared biological pathways and shared life stages.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => {
            const isJoined = joinedCircleIds.includes(item.id);
            const isSent = sentRequestIds.includes(item.id);

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      {item.kind}
                    </span>
                    <ShieldCheck className="size-4 text-primary" />
                  </div>

                  <h3 className="font-display text-xl leading-snug">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>

                  <div className="rounded-xl bg-background/80 p-3 text-xs space-y-1.5 border border-border/60">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary flex items-center gap-1">
                      <Sparkles className="size-3" /> Why Atlas suggested this
                    </p>
                    <p className="leading-relaxed text-muted-foreground">{item.reason}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => onOpenEvidence(item)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <BookOpen className="size-3.5" /> See the evidence
                  </button>

                  {item.kind === "circle" ? (
                    <Button
                      size="sm"
                      onClick={() => handleJoinCircle(item)}
                      disabled={isJoined}
                      className="rounded-full text-xs h-8 px-4"
                    >
                      {isJoined ? "Request Sent" : "Request to join"}
                    </Button>
                  ) : item.kind === "person" ? (
                    <Button
                      size="sm"
                      onClick={() => setRequestModal(item)}
                      disabled={isSent}
                      className="rounded-full text-xs h-8 px-4"
                    >
                      {isSent ? "Intro Sent" : "Request intro"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      asChild
                      variant="outline"
                      className="rounded-full text-xs h-8 px-4"
                    >
                      <a href={item.source_url || "https://clinicaltrials.gov"} target="_blank" rel="noreferrer">
                        View eligibility
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Intro Modal */}
      {requestModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl space-y-4">
            <h3 className="font-display text-2xl">Send a request, not your personal details</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Write a short note about what you hope to learn. The recipient can accept, decline, or suggest a group conversation. Your email and medical details stay completely private unless you both choose to share them.
            </p>
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-surface p-3 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRequestModal(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSendIntro}>
                Send request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
