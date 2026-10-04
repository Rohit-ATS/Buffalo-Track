import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Bookmark,
  Compass,
  FileText,
  FlaskConical,
  Heart,
  Home,
  Layers,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoriesTray } from "@/components/social/StoriesTray";
import { PostCard } from "@/components/social/PostCard";
import { CreatePostBox } from "@/components/social/CreatePostBox";
import { ReelsFeed } from "@/components/social/ReelsFeed";
import { ExploreView } from "@/components/social/ExploreView";
import { SocialProfileView } from "@/components/social/SocialProfileView";
import {
  fetchSocialPosts,
  publishPost,
  subscribeToPosts,
  type SocialPost,
  type StoryUser,
} from "@/lib/social-feed";
import {
  loadProfile,
  loadSuggestions,
  saveProfile,
  type FamilyProfile,
  type FamilySuggestion,
} from "@/lib/family-network";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { CirclesSection, MessagesSection } from "@/components/dashboard/sections";
import { ROLE_LABELS, type FamilyRole } from "@/lib/access";

export function InstagramDashboard({
  role,
  viewerId,
  initialTab = "home",
  onOpenIntegration,
}: {
  role: FamilyRole;
  viewerId: string | null;
  initialTab?: "home" | "explore" | "reels" | "messages" | "circles" | "profile";
  onOpenIntegration?: (section: string) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<
    "home" | "explore" | "reels" | "messages" | "circles" | "profile"
  >(initialTab);

  const [posts, setPosts] = React.useState<SocialPost[]>([]);
  const [profile, setProfile] = React.useState<FamilyProfile | null>(null);
  const [suggestions, setSuggestions] = React.useState<FamilySuggestion[]>([]);
  const [selectedStory, setSelectedStory] = React.useState<StoryUser | null>(null);
  const [evidenceModalItem, setEvidenceModalItem] = React.useState<FamilySuggestion | null>(null);
  const [profileEditModal, setProfileEditModal] = React.useState(false);
  const [profileDraft, setProfileDraft] = React.useState<FamilyProfile>({
    condition: "STXBP1 Encephalopathy",
    caregiver_role: "Parent / Caregiver",
    age_band: "School age (6–12)",
    timezone: "America/New_York",
    language: "English",
    help_needed: "Tracking seizure clusters, sleep routines, and communication devices.",
    matching_opt_in: true,
  });

  // Load feed and profile on mount
  React.useEffect(() => {
    void fetchSocialPosts().then(setPosts);
    void loadProfile().then((p) => {
      if (p) {
        setProfile(p);
        setProfileDraft(p);
      }
    });
    void loadSuggestions().then((s) => {
      if (s && s.length) setSuggestions(s);
    });

    // Real-time listener for incoming posts from other peers
    const unsubscribe = subscribeToPosts((newPost) => {
      setPosts((current) => [newPost, ...current]);
    });

    return () => unsubscribe();
  }, []);

  const handlePublishPost = async (
    body: string,
    tags: string[],
    imageUrl?: string,
    evidenceBadge?: string,
  ) => {
    const created = await publishPost(body, tags, imageUrl, evidenceBadge);
    setPosts([created, ...posts]);
  };

  const handleLikePost = (postId: string) => {
    setPosts(
      posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              has_liked: !p.has_liked,
              likes_count: p.has_liked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p,
      ),
    );
  };

  const handleCommentPost = (postId: string, text: string) => {
    setPosts(
      posts.map((p) => {
        if (p.id !== postId) return p;
        const newC = {
          id: `c-${Date.now()}`,
          post_id: postId,
          user_id: viewerId || "me",
          author_name: profile?.display_name || "You (Caregiver)",
          body: text,
          created_at: "Just now",
        };
        return {
          ...p,
          comments_count: p.comments_count + 1,
          comments: [...(p.comments || []), newC],
        };
      }),
    );
  };

  const handleSaveProfile = async () => {
    await saveProfile(profileDraft);
    setProfile(profileDraft);
    setProfileEditModal(false);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* -------------------- LEFT SIDEBAR (Instagram Style) -------------------- */}
      <aside className="sticky top-0 h-screen w-16 md:w-64 flex flex-col justify-between border-r border-border bg-surface px-3 py-6 z-30 shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 px-2">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-display font-bold shadow-sm">
              RA
            </div>
            <div className="hidden md:block">
              <span className="font-display text-base font-semibold block leading-tight">Rare Atlas</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Family Network</span>
            </div>
          </Link>

          {/* Main Navigation */}
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === "home"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Home className="size-5 shrink-0" />
              <span className="hidden md:inline">Feed</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("explore")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === "explore"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Compass className="size-5 shrink-0" />
              <span className="hidden md:inline">Explore & Matches</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reels")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === "reels"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Video className="size-5 shrink-0" />
              <span className="hidden md:inline">Reels & Stories</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("messages");
                if (onOpenIntegration) onOpenIntegration("messages");
              }}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === "messages"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <MessageCircle className="size-5 shrink-0" />
              <span className="hidden md:inline">Direct Messages</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("circles");
                if (onOpenIntegration) onOpenIntegration("circles");
              }}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === "circles"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Users className="size-5 shrink-0" />
              <span className="hidden md:inline">My Circles</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === "profile"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <User className="size-5 shrink-0" />
              <span className="hidden md:inline">Profile</span>
            </button>
          </nav>

          {/* Add-ons & Integrations */}
          <div className="pt-4 border-t border-border/70 hidden md:block">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Layers className="size-3 text-primary" /> Add-ons & Integrations
            </p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onOpenIntegration?.("research")}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <FlaskConical className="size-4 text-primary shrink-0" />
                <span>Research Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenIntegration?.("evidence")}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <FileText className="size-4 text-primary shrink-0" />
                <span>Evidence Review Layer</span>
              </button>

              {(role === "steward" || role === "admin") && (
                <button
                  type="button"
                  onClick={() => onOpenIntegration?.("moderation")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <ShieldAlert className="size-4 text-primary shrink-0" />
                  <span>Steward Moderation</span>
                </button>
              )}

              {role === "admin" && (
                <button
                  type="button"
                  onClick={() => onOpenIntegration?.("operations")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <ShieldCheck className="size-4 text-primary shrink-0" />
                  <span>Operations & Pipeline</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* User Card & Sign Out */}
        <div className="pt-4 border-t border-border/70">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="hidden md:block">
              <p className="text-xs font-semibold truncate">
                {profile?.display_name || "Caregiver Account"}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase">{ROLE_LABELS[role]}</p>
            </div>
            <button
              type="button"
              onClick={() => void getSupabaseBrowser()?.auth.signOut()}
              className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-secondary"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* -------------------- MAIN FEED CONTENT AREA -------------------- */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-5xl mx-auto">
        {activeTab === "home" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Center Feed Column */}
            <div>
              {/* Stories Tray */}
              <StoriesTray onSelectStory={() => setActiveTab("reels")} />

              {/* Create Post Composer */}
              <CreatePostBox onPublish={handlePublishPost} />

              {/* Feed Stream */}
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleLikePost}
                    onComment={handleCommentPost}
                  />
                ))}
              </div>
            </div>

            {/* Right Sidebar: Today's Radar & Connections */}
            <aside className="hidden lg:block space-y-6">
              {/* Today's 3 Key Steps Card */}
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="size-3.5" /> Caregiver Radar
                </div>
                <h3 className="font-display text-lg leading-tight">
                  Good morning. Here are three things that may help today.
                </h3>
                <ul className="space-y-3 text-xs text-muted-foreground pt-1">
                  <li className="flex items-start gap-2.5">
                    <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-foreground">People:</strong> 2 caregivers navigating related seizure disorders are open to connecting.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-foreground">Community:</strong> STXBP1 Foundation hosts a parent-led monthly Circle.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-foreground">Research:</strong> A natural-history study on presynaptic vesicle measures is actively recruiting.
                    </span>
                  </li>
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("explore")}
                  className="w-full text-xs rounded-full h-8 mt-1"
                >
                  Review Suggestions
                </Button>
              </div>

              {/* Suggested Connections */}
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Suggested For You
                </h4>
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-foreground">The SNARE Caregiver Circle</p>
                      <p className="text-[11px] text-muted-foreground">14 caregivers • Moderated</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveTab("explore")}
                      className="text-xs text-primary font-semibold h-7 px-2"
                    >
                      Join
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-foreground">Marcus Vance</p>
                      <p className="text-[11px] text-muted-foreground">Shares school-age seizure care</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveTab("explore")}
                      className="text-xs text-primary font-semibold h-7 px-2"
                    >
                      Connect
                    </Button>
                  </div>
                </div>
              </div>

              {/* Legal & Boundaries */}
              <p className="text-[11px] leading-relaxed text-muted-foreground px-1">
                Peer support only — not medical advice. Connections are suggested by biology receipts.
              </p>
            </aside>
          </div>
        )}

        {/* Explore & Suggestions Tab */}
        {activeTab === "explore" && (
          <ExploreView
            suggestions={suggestions}
            onOpenEvidence={(s) => setEvidenceModalItem(s)}
          />
        )}

        {/* Reels Tab */}
        {activeTab === "reels" && <ReelsFeed />}

        {/* Direct Messages Tab */}
        {activeTab === "messages" && (
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <MessagesSection viewerId={viewerId} />
          </div>
        )}

        {/* Circles Tab */}
        {activeTab === "circles" && (
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <CirclesSection viewerId={viewerId} />
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <SocialProfileView
            profile={profile}
            posts={posts}
            onEditProfile={() => setProfileEditModal(true)}
          />
        )}
      </main>

      {/* Profile Edit Modal */}
      {profileEditModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-xl space-y-4">
            <h3 className="font-display text-2xl">Find your people, at your pace</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Only share what you want Atlas to use. You decide who can contact you and whether to join a group or meet one peer first.
            </p>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Condition / Diagnosis</span>
                <input
                  type="text"
                  value={profileDraft.condition || ""}
                  onChange={(e) => setProfileDraft({ ...profileDraft, condition: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface p-2.5 outline-none focus:ring-1 focus:ring-primary"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Caregiver or Patient Role</span>
                <input
                  type="text"
                  value={profileDraft.caregiver_role || ""}
                  onChange={(e) => setProfileDraft({ ...profileDraft, caregiver_role: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface p-2.5 outline-none focus:ring-1 focus:ring-primary"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Age Band / Life Stage</span>
                <input
                  type="text"
                  value={profileDraft.age_band || ""}
                  onChange={(e) => setProfileDraft({ ...profileDraft, age_band: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface p-2.5 outline-none focus:ring-1 focus:ring-primary"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">Location / Time Zone</span>
                <input
                  type="text"
                  value={profileDraft.timezone || ""}
                  onChange={(e) => setProfileDraft({ ...profileDraft, timezone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface p-2.5 outline-none focus:ring-1 focus:ring-primary"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-foreground">What help would be useful?</span>
                <textarea
                  value={profileDraft.help_needed || ""}
                  onChange={(e) => setProfileDraft({ ...profileDraft, help_needed: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-surface p-2.5 outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setProfileEditModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveProfile}>
                Save Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Modal */}
      {evidenceModalItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl space-y-4">
            <h3 className="font-display text-2xl">Evidence behind this suggestion</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{evidenceModalItem.evidence_summary}</p>
            {evidenceModalItem.evidence_url && (
              <a
                href={evidenceModalItem.evidence_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-primary underline block"
              >
                Open reviewed clinical source
              </a>
            )}
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setEvidenceModalItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
