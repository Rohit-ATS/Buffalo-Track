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
  BookOpen,
  Radar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoriesTray } from "@/components/social/StoriesTray";
import { PostCard } from "@/components/social/PostCard";
import { CreatePostBox } from "@/components/social/CreatePostBox";
import { ReelsFeed } from "@/components/social/ReelsFeed";
import { ExploreView } from "@/components/social/ExploreView";
import { SocialProfileView } from "@/components/social/SocialProfileView";
import {
  addComment,
  fetchSocialPosts,
  publishPost,
  subscribeToFeed,
  toggleLike,
  type SocialPost,
  type StoryUser,
} from "@/lib/social-feed";
import { LearnView } from "@/components/social/LearnView";
import { DiscoveriesView } from "@/components/social/DiscoveriesView";
import {
  isOpenTrial,
  listConditions,
  loadConditionInsight,
  matchCondition,
  type ConditionInsight,
  type ConditionRef,
} from "@/lib/condition-insight";
import {
  loadProfile,
  loadSuggestions,
  saveProfile,
  type FamilyProfile,
  type FamilySuggestion,
} from "@/lib/family-network";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { CirclesSection, MessagesSection } from "@/components/dashboard/sections";
import { ROLE_LABELS, canSee, type FamilyRole } from "@/lib/access";

export function InstagramDashboard({
  role,
  viewerId,
  initialTab = "home",
  onOpenIntegration,
}: {
  role: FamilyRole;
  viewerId: string | null;
  initialTab?:
    "home" | "explore" | "reels" | "learn" | "discoveries" | "messages" | "circles" | "profile";
  onOpenIntegration?: (section: string) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<
    "home" | "explore" | "reels" | "learn" | "discoveries" | "messages" | "circles" | "profile"
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

  // The learning tabs: every condition in the atlas, plus the facts for the
  // one being read. Loaded lazily so the feed is not held up by them.
  const [conditions, setConditions] = React.useState<ConditionRef[]>([]);
  const [conditionId, setConditionId] = React.useState<string | null>(null);
  const [insight, setInsight] = React.useState<ConditionInsight | null>(null);
  const [insightLoading, setInsightLoading] = React.useState(false);

  // Load feed and profile on mount
  React.useEffect(() => {
    void fetchSocialPosts().then(setPosts);
    void loadProfile().then((p) => {
      if (p) {
        setProfile(p);
        setProfileDraft(p);
      } else if (viewerId) {
        // A signed-in account with no profile row yet. The editor opens once,
        // because the condition typed here is what the matching queries and the
        // Understand/Discoveries tabs key off -- without it they have nothing
        // to look up.
        setProfileEditModal(true);
      }
    });
    void loadSuggestions().then((s) => {
      if (s && s.length) setSuggestions(s);
    });

    // Other people's posts and comments, as they are written.
    const unsubscribe = subscribeToFeed({
      viewerId,
      onNewPost: (newPost) => setPosts((current) => [newPost, ...current]),
      onNewComment: (comment) =>
        setPosts((current) =>
          current.map((p) =>
            p.id === comment.post_id
              ? {
                  ...p,
                  comments_count: p.comments_count + 1,
                  comments: [...(p.comments ?? []), comment],
                }
              : p,
          ),
        ),
    });

    return () => unsubscribe();
  }, [viewerId]);

  // Resolve the viewer's typed condition ("STXBP1 Encephalopathy") to an atlas
  // record once, then let them browse any other condition from the picker.
  React.useEffect(() => {
    let cancelled = false;
    void listConditions().then((list) => {
      if (cancelled) return;
      setConditions(list);
      setConditionId((current) => {
        if (current) return current;
        return matchCondition(list, profile?.condition)?.id ?? list[0]?.id ?? null;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.condition]);

  React.useEffect(() => {
    const condition = conditions.find((c) => c.id === conditionId);
    if (!condition) return;

    let cancelled = false;
    setInsightLoading(true);
    void loadConditionInsight(condition)
      .then((result) => {
        if (!cancelled) setInsight(result);
      })
      .finally(() => {
        if (!cancelled) setInsightLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conditionId, conditions]);

  const handlePublishPost = async (
    body: string,
    tags: string[],
    imageUrl?: string,
    evidenceBadge?: string,
  ) => {
    const created = await publishPost(body, tags, imageUrl, evidenceBadge);
    setPosts([created, ...posts]);
  };

  /** Optimistic locally, then stored, then reconciled with what was stored. */
  const handleLikePost = async (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (!target) return;

    setPosts((current) =>
      current.map((p) =>
        p.id === postId
          ? {
              ...p,
              has_liked: !p.has_liked,
              likes_count: p.has_liked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p,
      ),
    );

    const stored = await toggleLike(postId, target.has_liked ?? false, target.likes_count);
    setPosts((current) =>
      current.map((p) =>
        p.id === postId ? { ...p, has_liked: stored.liked, likes_count: stored.count } : p,
      ),
    );
  };

  const handleCommentPost = async (postId: string, text: string) => {
    const stored = await addComment(postId, text);
    setPosts((current) =>
      current.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments_count: p.comments_count + 1,
              comments: [...(p.comments ?? []), stored],
            }
          : p,
      ),
    );
  };

  const handleSaveProfile = async () => {
    await saveProfile(profileDraft);
    setProfile(profileDraft);
    setProfileEditModal(false);
  };

  const integrations = INTEGRATIONS.filter((item) => canSee(role, item.section));
  const openTrialCount = insight?.trials.filter((t) => isOpenTrial(t.status)).length ?? 0;

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
              <span className="font-display text-base font-semibold block leading-tight">
                Rare Atlas
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Family Network
              </span>
            </div>
          </Link>

          {/* Main Navigation */}
          <nav className="space-y-1">
            <NavItem
              icon={Home}
              label="Feed"
              active={activeTab === "home"}
              onClick={() => setActiveTab("home")}
            />
            <NavItem
              icon={Compass}
              label="Explore & Matches"
              active={activeTab === "explore"}
              onClick={() => setActiveTab("explore")}
            />
            <NavItem
              icon={Video}
              label="Reels & Stories"
              active={activeTab === "reels"}
              onClick={() => setActiveTab("reels")}
            />
            <NavItem
              icon={BookOpen}
              label="Understand it"
              active={activeTab === "learn"}
              onClick={() => setActiveTab("learn")}
            />
            <NavItem
              icon={Radar}
              label="Discoveries"
              active={activeTab === "discoveries"}
              onClick={() => setActiveTab("discoveries")}
            />
            <NavItem
              icon={MessageCircle}
              label="Direct Messages"
              active={activeTab === "messages"}
              onClick={() => setActiveTab("messages")}
            />
            <NavItem
              icon={Users}
              label="My Circles"
              active={activeTab === "circles"}
              onClick={() => setActiveTab("circles")}
            />
            <NavItem
              icon={User}
              label="Profile"
              active={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
            />
          </nav>

          {/*
            Add-ons the viewer may actually open.
            `canSee` is the same table the dashboard nav uses, so a family
            member is not offered the evidence layer or the research workspace
            -- the RLS would refuse the queries, and listing them would imply
            the product shares family data with reviewers. It does not.
          */}
          {integrations.length > 0 && (
            <div className="hidden border-t border-border/70 pt-4 md:block">
              <p className="mb-2 flex items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Layers className="size-3 text-primary" /> Add-ons & Integrations
              </p>
              <div className="space-y-1">
                {integrations.map((item) => (
                  <button
                    key={item.section}
                    type="button"
                    onClick={() => onOpenIntegration?.(item.section)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <item.icon className="size-4 shrink-0 text-primary" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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

            {/* Right rail: what the atlas actually knows about this condition. */}
            <aside className="hidden space-y-6 lg:block">
              <div className="space-y-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="size-3.5" /> Caregiver Radar
                </div>

                {insight ? (
                  <>
                    <h3 className="font-display text-lg leading-tight">{insight.condition.name}</h3>
                    {/*
                      Counts, not claims. Each one is a row count from the
                      atlas, so the card cannot drift from the tabs it links to.
                    */}
                    <ul className="space-y-3 pt-1 text-xs text-muted-foreground">
                      <RadarRow
                        label="Studies open"
                        value={`${openTrialCount} of ${insight.trials.length} registered studies are still accepting participants.`}
                      />
                      <RadarRow
                        label="Signs recorded"
                        value={`${insight.symptoms.length} symptoms are described in the literature for this condition.`}
                      />
                      <RadarRow
                        label="Shared biology"
                        value={
                          insight.related.length
                            ? `${insight.related.length} connections to other conditions, each with a source.`
                            : "No connections to other conditions are recorded yet."
                        }
                      />
                    </ul>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab("discoveries")}
                        className="h-8 flex-1 rounded-full text-xs"
                      >
                        Discoveries
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab("learn")}
                        className="h-8 flex-1 rounded-full text-xs"
                      >
                        Understand it
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Add your condition to your profile and this panel will track the studies and
                    findings recorded for it.
                  </p>
                )}
              </div>

              {/* Suggested connections, from the matching query -- not a fixture. */}
              <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Suggested For You
                </h4>
                {suggestions.length === 0 ? (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Suggestions appear once your profile says what you are living with and what
                    would help. Nothing is suggested from an empty profile.
                  </p>
                ) : (
                  <div className="space-y-3 pt-1">
                    {suggestions.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{item.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {item.detail}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setActiveTab("explore")}
                          className="h-7 shrink-0 px-2 text-xs font-semibold text-primary"
                        >
                          {item.kind === "circle" ? "Join" : "View"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                Peer support only — not medical advice. Connections are suggested by biology
                receipts.
              </p>
            </aside>
          </div>
        )}

        {/* Explore & Suggestions Tab */}
        {activeTab === "explore" && (
          <ExploreView suggestions={suggestions} onOpenEvidence={(s) => setEvidenceModalItem(s)} />
        )}

        {/* Reels Tab */}
        {activeTab === "reels" && <ReelsFeed />}

        {/* Understand the condition: symptoms, open questions, shared biology */}
        {activeTab === "learn" && (
          <LearnView
            insight={insight}
            conditions={conditions}
            loading={insightLoading}
            onPickCondition={setConditionId}
          />
        )}

        {/* Upcoming discoveries: studies registered for this condition */}
        {activeTab === "discoveries" && (
          <DiscoveriesView
            insight={insight}
            conditions={conditions}
            loading={insightLoading}
            onPickCondition={setConditionId}
          />
        )}

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
              Only share what you want Atlas to use. You decide who can contact you and whether to
              join a group or meet one peer first.
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
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, caregiver_role: e.target.value })
                  }
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
                  onChange={(e) =>
                    setProfileDraft({ ...profileDraft, help_needed: e.target.value })
                  }
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
            <p className="text-xs leading-relaxed text-muted-foreground">
              {evidenceModalItem.evidence_summary}
            </p>
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

/** One sidebar link. Eight near-identical buttons were eight places to drift. */
function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
        active
          ? "bg-primary font-semibold text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="size-5 shrink-0" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

/**
 * The other dashboards, for the roles that have them. `section` matches the
 * SectionId in lib/access.ts, which is what gates them and what the shell
 * navigates to.
 */
const INTEGRATIONS = [
  { section: "research", label: "Research Workspace", icon: FlaskConical },
  { section: "evidence", label: "Evidence Review Layer", icon: FileText },
  { section: "moderation", label: "Steward Moderation", icon: ShieldAlert },
  { section: "operations", label: "Operations & Pipeline", icon: ShieldCheck },
] as const;

/** One line of the radar card: a label and the count behind it. */
function RadarRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
      <span>
        <strong className="text-foreground">{label}:</strong> {value}
      </span>
    </li>
  );
}
