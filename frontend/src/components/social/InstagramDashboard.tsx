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
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Video,
  X,
  BookOpen,
  Radar,
  Zap,
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
import { CirclesSection } from "@/components/dashboard/sections";
import { DirectMessages } from "@/components/social/DirectMessages";
import { ClusterActionDossier } from "@/components/ClusterActionDossier";
import { MoonshotAcceleratorModal } from "@/components/MoonshotAcceleratorModal";
import { OpenAIProposalModal } from "@/components/OpenAIProposalModal";
import { ROLE_LABELS, canSee, type FamilyRole } from "@/lib/access";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

const PROFILE_FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface/60 px-4 text-base text-foreground transition-[background-color,border-color,box-shadow] placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10";

const PROFILE_TEXTAREA_CLASS =
  "min-h-32 w-full resize-y rounded-xl border border-border bg-surface/60 px-4 py-3 text-base text-foreground transition-[background-color,border-color,box-shadow] placeholder:text-muted-foreground hover:border-primary/40 focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10";

const PROFILE_MODAL_EXIT_DURATION = 240;

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
  const [isProfileEditorMounted, setIsProfileEditorMounted] = React.useState(false);
  const [moonshotModal, setMoonshotModal] = React.useState(false);
  const [proposalModal, setProposalModal] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [profileDraft, setProfileDraft] = React.useState<FamilyProfile>({
    condition: "STXBP1 Encephalopathy",
    caregiver_role: "Parent / Caregiver",
    age_band: "School age (6–12)",
    timezone: "America/New_York",
    language: "English",
    help_needed: "Tracking seizure clusters, sleep routines, and communication devices.",
    matching_opt_in: false,
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

  // Keep the editor in the DOM briefly after a close request so its exit
  // animation can play before the dialog is unmounted.
  React.useEffect(() => {
    if (profileEditModal) {
      setIsProfileEditorMounted(true);
      return;
    }

    const timeout = window.setTimeout(
      () => setIsProfileEditorMounted(false),
      PROFILE_MODAL_EXIT_DURATION,
    );
    return () => window.clearTimeout(timeout);
  }, [profileEditModal]);

  React.useEffect(() => {
    if (!profileEditModal) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setProfileEditModal(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [profileEditModal]);

  const handlePublishPost = async (
    body: string,
    tags: string[],
    imageUrl: string | undefined,
    evidenceBadge: string | undefined,
    circleId: string | null,
  ) => {
    // No try/catch here: a failed publish must surface to the person who
    // wrote it, so the rejection is left to propagate to CreatePostBox, which
    // keeps the draft on screen and shows the real error instead of this
    // silently discarding it.
    const created = await publishPost(body, tags, imageUrl, evidenceBadge, circleId);
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

  const closeProfileEditor = () => setProfileEditModal(false);

  const integrations = INTEGRATIONS.filter((item) => canSee(role, item.section));
  const openTrialCount = insight?.trials.filter((t) => isOpenTrial(t.status)).length ?? 0;
  const sidebarToggleLabel = sidebarCollapsed
    ? "Expand navigation sidebar"
    : "Collapse navigation sidebar";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* -------------------- LEFT SIDEBAR (Instagram Style) -------------------- */}
      <aside
        id="family-navigation"
        className={`relative sticky top-0 z-30 flex h-screen shrink-0 flex-col justify-between border-r border-border bg-surface py-6 transition-[width,padding] duration-300 ease-out motion-reduce:transition-none ${
          sidebarCollapsed ? "w-16 px-2 md:w-20" : "w-16 px-2 md:w-64 md:px-3"
        }`}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((current) => !current)}
          className="absolute -right-3 top-7 z-10 hidden size-7 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:grid"
          aria-label={sidebarToggleLabel}
          aria-controls="family-navigation"
          aria-expanded={!sidebarCollapsed}
          title={sidebarToggleLabel}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-3.5" />
          ) : (
            <PanelLeftClose className="size-3.5" />
          )}
        </button>
        <div className="space-y-6">
          {/* Logo */}
          <Link
            to="/"
            className={`flex items-center px-2 ${
              sidebarCollapsed ? "justify-center" : "justify-center md:justify-start md:gap-3"
            }`}
          >
            <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-display font-bold shadow-sm">
              RA
            </div>
            <div className={sidebarCollapsed ? "hidden" : "hidden md:block"}>
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
              collapsed={sidebarCollapsed}
            />
            <NavItem
              icon={Compass}
              label="Explore & Matches"
              active={activeTab === "explore"}
              onClick={() => setActiveTab("explore")}
              collapsed={sidebarCollapsed}
            />
            <NavItem
              icon={Video}
              label="Reels & Stories"
              active={activeTab === "reels"}
              onClick={() => setActiveTab("reels")}
              collapsed={sidebarCollapsed}
            />
            <NavItem
              icon={BookOpen}
              label="Understand it"
              active={activeTab === "learn"}
              onClick={() => setActiveTab("learn")}
              collapsed={sidebarCollapsed}
            />
            <NavItem
              icon={Radar}
              label="Discoveries"
              active={activeTab === "discoveries"}
              onClick={() => setActiveTab("discoveries")}
              collapsed={sidebarCollapsed}
            />
            <NavItem
              icon={MessageCircle}
              label="Direct Messages"
              active={activeTab === "messages"}
              onClick={() => setActiveTab("messages")}
              collapsed={sidebarCollapsed}
            />
            <NavItem
              icon={Users}
              label="My Circles"
              active={activeTab === "circles"}
              onClick={() => setActiveTab("circles")}
              collapsed={sidebarCollapsed}
            />
            <NavItem
              icon={User}
              label="Profile"
              active={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
              collapsed={sidebarCollapsed}
            />
          </nav>

          {/* Challenge 05 Tools */}
          <div className="hidden border-t border-border/70 pt-4 md:block">
            <p
              className={`mb-2 items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${
                sidebarCollapsed ? "hidden" : "flex"
              }`}
            >
              <Sparkles className="size-3 text-primary" /> Challenge 05 Tools
            </p>
            <div className="space-y-1 mb-3">
              <button
                type="button"
                onClick={() => setMoonshotModal(true)}
                title="10× Moonshot Timeline"
                className={`flex w-full items-center rounded-lg py-2 text-xs font-medium text-primary bg-primary/10 transition-colors hover:bg-primary/20 ${
                  sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-3"
                }`}
              >
                <Zap className="size-4 shrink-0 text-primary" />
                <span className={sidebarCollapsed ? "hidden" : "truncate"}>
                  10× Moonshot Timeline
                </span>
              </button>

              <button
                type="button"
                onClick={() => setProposalModal(true)}
                title="OpenAI Sourced Proposal"
                className={`flex w-full items-center rounded-lg py-2 text-xs font-medium text-primary bg-primary/10 transition-colors hover:bg-primary/20 ${
                  sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-3"
                }`}
              >
                <FileText className="size-4 shrink-0 text-primary" />
                <span className={sidebarCollapsed ? "hidden" : "truncate"}>
                  OpenAI Sourced Proposal
                </span>
              </button>
            </div>

            {/*
              Add-ons the viewer may actually open.
              `canSee` is the same table the dashboard nav uses, so a family
              member is not offered the evidence layer or the research workspace
              -- the RLS would refuse the queries, and listing them would imply
              the product shares family data with reviewers. It does not.
            */}
            {integrations.length > 0 && (
              <>
                <p
                  className={`mb-2 items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${
                    sidebarCollapsed ? "hidden" : "flex"
                  }`}
                >
                  <Layers className="size-3 text-primary" /> Add-ons & Integrations
                </p>
                <div className="space-y-1">
                  {integrations.map((item) => (
                    <button
                      key={item.section}
                      type="button"
                      onClick={() => onOpenIntegration?.(item.section)}
                      title={item.label}
                      className={`flex w-full items-center rounded-lg py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground ${
                        sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-3"
                      }`}
                    >
                      <item.icon className="size-4 shrink-0 text-primary" />
                      <span className={sidebarCollapsed ? "hidden" : "truncate"}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* User Card & Sign Out */}
        <div className="pt-4 border-t border-border/70">
          <div
            className={`flex items-center gap-2 px-1 ${
              sidebarCollapsed ? "justify-center" : "justify-center md:justify-between"
            }`}
          >
            <div className={sidebarCollapsed ? "hidden" : "hidden md:block"}>
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
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        {/* Messages fill the frame edge to edge: an inbox is a page, not a card. */}
        {activeTab === "messages" && <DirectMessages viewerId={viewerId} />}

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 ${
            activeTab === "messages" ? "hidden" : ""
          }`}
        >
          {activeTab === "home" && (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
              {/* Center Feed Column */}
              <div className="space-y-6">
                {/* Challenge 05 Primary Journey: Mechanism Cluster & Action Dossier */}
                <ClusterActionDossier
                  clusterName="SNARE Vesicle Fusion Cluster"
                  primaryDisease={profile?.condition || "STXBP1 Encephalopathy"}
                  onOpenMoonshot={() => setMoonshotModal(true)}
                  onOpenProposal={() => setProposalModal(true)}
                />

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
              <aside className="hidden space-y-6 xl:block">
                <div className="space-y-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                    <Sparkles className="size-3.5" /> Caregiver Radar
                  </div>

                  {insight ? (
                    <>
                      <h3 className="font-display text-lg leading-tight">
                        {insight.condition.name}
                      </h3>
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
            <ExploreView
              suggestions={suggestions}
              onOpenEvidence={(s) => setEvidenceModalItem(s)}
            />
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

          {/* Circles Tab */}
          {activeTab === "circles" && <CirclesSection viewerId={viewerId} />}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <SocialProfileView
              profile={profile}
              posts={posts}
              onEditProfile={() => setProfileEditModal(true)}
            />
          )}
        </div>
      </main>

      {/* Profile Edit Modal */}
      {isProfileEditorMounted && (
        <div
          className={`family-profile-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-foreground/55 p-3 backdrop-blur-sm sm:p-6 ${
            profileEditModal ? "" : "family-profile-modal-backdrop--closing"
          }`}
        >
          <div className="flex min-h-full items-center justify-center">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="family-profile-title"
              aria-describedby="family-profile-description"
              className={`family-profile-modal-card my-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border/80 bg-background shadow-2xl ${
                profileEditModal ? "" : "pointer-events-none family-profile-modal-card--closing"
              }`}
            >
              <header className="border-b border-border/70 bg-surface/45 px-6 py-6 sm:px-8 md:px-10 md:py-8">
                <div className="flex items-start justify-between gap-5">
                  <div className="max-w-3xl">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      <ShieldCheck className="size-3.5" aria-hidden="true" /> Private family profile
                    </span>
                    <h2
                      id="family-profile-title"
                      className="mt-4 font-display text-3xl leading-tight sm:text-4xl"
                    >
                      Find your people, at your pace
                    </h2>
                    <p
                      id="family-profile-description"
                      className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
                    >
                      Share only what helps Atlas surface relevant research, circles, and peers. You
                      stay in control of who can contact you and what you update.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeProfileEditor}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Close profile editor"
                    title="Close"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </header>

              <form
                className="px-6 py-6 sm:px-8 md:px-10 md:py-8"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSaveProfile();
                }}
              >
                <div className="grid gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-6">
                  <label className="block space-y-2 md:col-span-2">
                    <span className="flex items-center justify-between gap-3 text-sm font-semibold text-foreground">
                      Condition / Diagnosis
                      <span className="text-xs font-medium text-muted-foreground">Required</span>
                    </span>
                    <input
                      type="text"
                      required
                      value={profileDraft.condition || ""}
                      onChange={(e) =>
                        setProfileDraft({ ...profileDraft, condition: e.target.value })
                      }
                      className={PROFILE_FIELD_CLASS}
                      placeholder="e.g. STXBP1 Encephalopathy"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-foreground">
                      Caregiver or patient role
                    </span>
                    <input
                      type="text"
                      value={profileDraft.caregiver_role || ""}
                      onChange={(e) =>
                        setProfileDraft({ ...profileDraft, caregiver_role: e.target.value })
                      }
                      className={PROFILE_FIELD_CLASS}
                      placeholder="e.g. Parent / Caregiver"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-foreground">
                      Age band / life stage
                    </span>
                    <input
                      type="text"
                      value={profileDraft.age_band || ""}
                      onChange={(e) =>
                        setProfileDraft({ ...profileDraft, age_band: e.target.value })
                      }
                      className={PROFILE_FIELD_CLASS}
                      placeholder="e.g. School age (6–12)"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-foreground">
                      Location / time zone
                    </span>
                    <input
                      type="text"
                      value={profileDraft.timezone || ""}
                      onChange={(e) =>
                        setProfileDraft({ ...profileDraft, timezone: e.target.value })
                      }
                      className={PROFILE_FIELD_CLASS}
                      placeholder="e.g. America/New_York"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-foreground">
                      Preferred language
                    </span>
                    <input
                      type="text"
                      value={profileDraft.language || ""}
                      onChange={(e) =>
                        setProfileDraft({ ...profileDraft, language: e.target.value })
                      }
                      className={PROFILE_FIELD_CLASS}
                      placeholder="e.g. English"
                    />
                  </label>

                  <label className="block space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold text-foreground">
                      What help would be useful?
                    </span>
                    <textarea
                      value={profileDraft.help_needed || ""}
                      onChange={(e) =>
                        setProfileDraft({ ...profileDraft, help_needed: e.target.value })
                      }
                      rows={4}
                      className={PROFILE_TEXTAREA_CLASS}
                      placeholder="For example: tracking symptoms, navigating a new diagnosis, or finding a study."
                    />
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={profileDraft.matching_opt_in}
                      onChange={(e) =>
                        setProfileDraft({ ...profileDraft, matching_opt_in: e.target.checked })
                      }
                      className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-semibold text-foreground">
                        Include me in relevant peer and circle matches
                      </span>
                      <span className="block text-xs leading-relaxed text-muted-foreground">
                        We will use the details above to suggest connections. You can turn this off
                        at any time, and researchers cannot view this private profile.
                      </span>
                    </span>
                  </label>
                </div>

                <footer className="mt-8 flex flex-col-reverse gap-4 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Your profile stays private and can be updated whenever your needs change.
                  </p>
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={closeProfileEditor}
                      className="px-5"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="min-w-40 px-7">
                      Save profile
                    </Button>
                  </div>
                </footer>
              </form>
            </section>
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

      {/* Moonshot 10x Accelerator Modal */}
      <MoonshotAcceleratorModal
        isOpen={moonshotModal}
        onClose={() => setMoonshotModal(false)}
        diseaseName={profile?.condition || "STXBP1 Encephalopathy"}
      />

      {/* OpenAI Proposal Generator Modal */}
      <OpenAIProposalModal
        isOpen={proposalModal}
        onClose={() => setProposalModal(false)}
        disease={profile?.condition || "STXBP1 Encephalopathy"}
        targetName="Lead Investigator & Natural History Study PI"
        sharedPathway="SNARE Vesicle Docking & Fusion"
        partnerOrg="STXBP1 Foundation"
      />
    </div>
  );
}

/** One sidebar link. Eight near-identical buttons were eight places to drift. */
function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  collapsed,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={label}
      className={`flex w-full items-center rounded-xl py-3 text-sm font-medium transition-colors ${
        collapsed
          ? "justify-center gap-0 px-2"
          : "justify-center gap-0 px-2 md:justify-start md:gap-3.5 md:px-3"
      } ${
        active
          ? "bg-primary font-semibold text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="size-5 shrink-0" />
      <span className={collapsed ? "hidden" : "hidden truncate md:inline"}>{label}</span>
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
