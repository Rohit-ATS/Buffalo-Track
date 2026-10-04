import * as React from "react";
import { Bookmark, Edit3, Grid, Heart, Lock, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FamilyProfile } from "@/lib/family-network";
import type { SocialPost } from "@/lib/social-feed";

export function SocialProfileView({
  profile,
  posts,
  onEditProfile,
}: {
  profile: FamilyProfile | null;
  posts: SocialPost[];
  onEditProfile: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<"posts" | "saved" | "circles">("posts");

  return (
    <div className="space-y-6">
      {/* Profile Header (Instagram Style) */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar with Ring */}
          <div className="relative size-24 shrink-0 rounded-full p-[3px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
            <div className="size-full rounded-full border-2 border-background bg-secondary grid place-items-center font-display text-2xl font-bold text-primary">
              {profile?.display_name ? profile.display_name.slice(0, 2).toUpperCase() : "ME"}
            </div>
          </div>

          {/* User Details & Stats */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl leading-tight">
                  {profile?.display_name || "Caregiver Profile"}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {profile?.caregiver_role || "Caregiver"}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="size-3" /> Private Profile
                  </span>
                </div>
              </div>

              <Button size="sm" variant="outline" onClick={onEditProfile} className="rounded-full text-xs h-8">
                <Edit3 className="size-3.5 mr-1.5" /> Edit Profile
              </Button>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 border-y border-border/60 py-3 text-xs">
              <div>
                <strong className="text-sm font-semibold text-foreground">{posts.length}</strong>{" "}
                <span className="text-muted-foreground">posts</span>
              </div>
              <div>
                <strong className="text-sm font-semibold text-foreground">14</strong>{" "}
                <span className="text-muted-foreground">connected peers</span>
              </div>
              <div>
                <strong className="text-sm font-semibold text-foreground">3</strong>{" "}
                <span className="text-muted-foreground">circles</span>
              </div>
              <div>
                <strong className="text-sm font-semibold text-foreground">6</strong>{" "}
                <span className="text-muted-foreground">evidence receipts</span>
              </div>
            </div>

            {/* Bio Information */}
            <div className="text-xs space-y-1.5 leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">Condition:</strong>{" "}
                {profile?.condition || "STXBP1 Encephalopathy"}
              </p>
              <p>
                <strong className="text-foreground">Life Stage:</strong>{" "}
                {profile?.age_band || "School age (6–12)"} • {profile?.timezone || "America/New_York"}
              </p>
              <p>
                <strong className="text-foreground">What help would be useful:</strong>{" "}
                {profile?.help_needed || "Tracking seizure clusters and comparing natural-history measures with other families."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "posts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Grid className="size-4" /> My Posts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "saved"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bookmark className="size-4" /> Saved Evidence
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("circles")}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "circles"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-4" /> My Circles
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "posts" && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="overflow-hidden rounded-xl border border-border bg-surface p-4 text-xs space-y-2 flex flex-col justify-between"
            >
              <p className="line-clamp-4 leading-relaxed text-foreground">{post.body}</p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                <span className="flex items-center gap-1">
                  <Heart className="size-3.5 fill-rose-500 text-rose-500" /> {post.likes_count}
                </span>
                <span>{post.created_at}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "saved" && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <h3 className="font-semibold text-sm">Saved Evidence Receipts</h3>
          <p className="text-xs text-muted-foreground">
            Receipts and clinical trials saved from peer posts and circle discussions.
          </p>
          <div className="space-y-2 pt-2">
            <div className="rounded-lg border border-border/80 bg-background p-3 text-xs flex justify-between items-center">
              <div>
                <p className="font-semibold">STX1B ↔ STXBP1 Vesicle Fusion Link</p>
                <p className="text-muted-foreground text-[11px]">Reviewed biology citation • PubMed ID 31024001</p>
              </div>
              <ShieldCheck className="size-4 text-primary" />
            </div>
            <div className="rounded-lg border border-border/80 bg-background p-3 text-xs flex justify-between items-center">
              <div>
                <p className="font-semibold">Natural History Study for STXBP1 Cohort</p>
                <p className="text-muted-foreground text-[11px]">ClinicalTrials.gov NCT04870502</p>
              </div>
              <ShieldCheck className="size-4 text-primary" />
            </div>
          </div>
        </div>
      )}

      {activeTab === "circles" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">The SNARE Caregiver Circle</h4>
              <span className="rounded-full bg-example-mint px-2 py-0.5 text-[10px] text-primary font-medium">Active Member</span>
            </div>
            <p className="text-muted-foreground">14 caregivers • Moderated by STXBP1 Foundation steward</p>
          </div>
        </div>
      )}
    </div>
  );
}
