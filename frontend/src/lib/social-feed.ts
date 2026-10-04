import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { currentUser } from "@/lib/family-network";

export type SocialPost = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: "Caregiver" | "Patient" | "Steward" | "Clinician";
  condition: string;
  // `| undefined` is explicit because the project compiles with
  // exactOptionalPropertyTypes, where `?:` alone forbids assigning undefined.
  biology_badge?: string | undefined;
  body: string;
  image_url?: string | null | undefined;
  tags: string[];
  evidence_badge?: string | null | undefined;
  evidence_link?: string | null | undefined;
  likes_count: number;
  comments_count: number;
  has_liked?: boolean | undefined;
  created_at: string;
  comments?: SocialComment[] | undefined;
  /** Null = public to the signed-in community. Set = visible only to that
   *  circle's active members and steward (supabase/migrations/20261004000021_social_feed_circle_privacy.sql). */
  circle_id: string | null;
  /** Resolved alongside circle_id for display; null for a public post. */
  circle_name?: string | null | undefined;
};

export type SocialComment = {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export type SocialReel = {
  id: string;
  author_name: string;
  author_role: string;
  condition: string;
  title: string;
  caption: string;
  video_url: string;
  thumbnail_url: string;
  duration: string;
  tags: string[];
  likes_count: number;
  created_at: string;
};

export type StoryUser = {
  id: string;
  name: string;
  condition: string;
  avatar_url?: string;
  has_unseen: boolean;
  reel_id?: string;
};

// Rich curated initial social feed of connected rare-disease peers
export const INITIAL_POSTS: SocialPost[] = [
  {
    id: "post-1",
    circle_id: null, // curated demo content: public to the signed-in community
    author_id: "user-elena",
    author_name: "Elena Rostova",
    author_role: "Caregiver",
    condition: "STXBP1 Encephalopathy",
    biology_badge: "Presynaptic Vesicle Fusion",
    body: "Milestone day for our family! After 6 months of systematic seizure tracking with our pediatric neurologist, Leo went 45 days without a focal seizure cluster. To any parents just starting this journey: keeping an hourly sleep and meal log made all the difference in spotting triggers. You are not alone in this.",
    image_url:
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=80",
    tags: ["#STXBP1", "#SeizureDiary", "#CaregiverWins", "#SchoolAge"],
    evidence_badge: "Reviewed Natural-History Measure",
    evidence_link: "https://clinicaltrials.gov",
    likes_count: 34,
    comments_count: 5,
    has_liked: false,
    created_at: "2 hours ago",
    comments: [
      {
        id: "c-1",
        post_id: "post-1",
        user_id: "u-marcus",
        author_name: "Marcus Vance (Caregiver)",
        body: "So happy for you and Leo! Did you notice any correlation with bedtime temperature? We are seeing that in our child.",
        created_at: "1 hour ago",
      },
      {
        id: "c-2",
        post_id: "post-1",
        user_id: "user-elena",
        author_name: "Elena Rostova",
        body: "@Marcus Vance Yes! Keeping the room at 67F significantly reduced nighttime waking clusters.",
        created_at: "45 min ago",
      },
    ],
  },
  {
    id: "post-2",
    circle_id: null, // curated demo content: public to the signed-in community
    author_id: "user-snare-foundation",
    author_name: "STXBP1 Foundation Circle",
    author_role: "Steward",
    condition: "SNARE Complex Disorders",
    biology_badge: "Shared SNARE Pathway",
    body: "Reminder for circle members: Our monthly parent-led introduction circle meets this Thursday at 7 PM ET. We will be discussing speech-generating AAC devices, sensory integration strategies, and the latest clinical trial pipeline update. Tap to RSVP or join the conversation.",
    tags: ["#CommunityCircle", "#AACDevices", "#ParentSupport", "#STXBP1"],
    evidence_badge: "Moderated Circle · Verified Non-Profit",
    evidence_link: "#circle",
    likes_count: 52,
    comments_count: 8,
    has_liked: true,
    created_at: "5 hours ago",
    comments: [
      {
        id: "c-3",
        post_id: "post-2",
        user_id: "u-sarah",
        author_name: "Sarah Jenkins",
        body: "Looking forward to this. AAC was a game changer for non-verbal frustration.",
        created_at: "3 hours ago",
      },
    ],
  },
  {
    id: "post-3",
    circle_id: null, // curated demo content: public to the signed-in community
    author_id: "user-david",
    author_name: "David Chen",
    author_role: "Patient",
    condition: "CACNA1A Episodic Ataxia",
    biology_badge: "Calcium Channelopathy",
    body: "A lot of newly diagnosed adults ask how to explain fluctuating ataxia to employers. I created a 1-page work accommodation sheet with my neurologist that outlines good days vs. flare days without getting bogged down in medical jargon. Happy to share the template with anyone in our circle!",
    tags: ["#CACNA1A", "#AdultRareDisease", "#Accommodations", "#PeerResource"],
    evidence_badge: "Verified Community Asset",
    likes_count: 28,
    comments_count: 4,
    has_liked: false,
    created_at: "Yesterday",
    comments: [],
  },
  {
    id: "post-4",
    circle_id: null, // curated demo content: public to the signed-in community
    author_id: "user-priya",
    author_name: "Priya Raman",
    author_role: "Caregiver",
    condition: "SCN2A-related disorder",
    biology_badge: "Neuronal Excitability",
    body: "Nobody warned me that the hardest part of an AAC device would be us, not her. We spent two weeks modelling it ourselves before Aanya touched it — narrating our own day out loud, tapping the buttons while we talked. Week three she asked for music, unprompted. If you are in week one and it feels pointless: it is not. Keep modelling.",
    image_url:
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80",
    tags: ["#AACDevices", "#SCN2A", "#Communication", "#CaregiverWins"],
    evidence_badge: null,
    evidence_link: null,
    likes_count: 61,
    comments_count: 2,
    has_liked: false,
    created_at: "2 days ago",
    comments: [
      {
        id: "c-4",
        post_id: "post-4",
        user_id: "u-sarah",
        author_name: "Sarah Jenkins",
        body: "The modelling point is the one our SLT kept repeating and I kept skipping. Thank you for saying it plainly.",
        created_at: "1 day ago",
      },
    ],
  },
  {
    id: "post-5",
    circle_id: null, // curated demo content: public to the signed-in community
    author_id: "user-sarah",
    author_role: "Caregiver",
    author_name: "Sarah Jenkins",
    condition: "KCNQ2 encephalopathy",
    biology_badge: "Potassium Channel",
    body: "Four years of broken sleep and I had stopped believing anything would shift it. Our sleep clinic built a routine around Noah's actual wake pattern instead of a textbook one — same wake time every day including weekends, light exposure within ten minutes, no screens after the bath. It took eleven weeks, not the two the leaflet promised. Posting the honest timeline because the leaflets made me feel like I was failing.",
    tags: ["#SleepRoutine", "#KCNQ2", "#HonestTimelines"],
    evidence_badge: null,
    evidence_link: null,
    likes_count: 94,
    comments_count: 3,
    has_liked: false,
    created_at: "3 days ago",
    comments: [],
  },
  {
    id: "post-6",
    circle_id: null, // curated demo content: public to the signed-in community
    author_id: "user-snare-foundation",
    author_name: "STXBP1 Foundation Circle",
    author_role: "Steward",
    condition: "SNARE Complex Disorders",
    biology_badge: "Shared SNARE Pathway",
    body: "Hospital bag thread, crowd-sourced from 40 families and now pinned to the circle. Top three things people wish they had packed: a printed one-page medication summary (wards lose the digital one), your child's own pillow, and a spare phone charger with a long cable because the socket is never near the bed. Add yours in the comments and we will fold it into the list.",
    image_url:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
    tags: ["#HospitalPrep", "#CommunityCircle", "#PeerWisdom"],
    evidence_badge: "Moderated Circle · Verified Non-Profit",
    evidence_link: "#circle",
    likes_count: 118,
    comments_count: 6,
    has_liked: false,
    created_at: "4 days ago",
    comments: [],
  },
];

/**
 * Demo reels.
 *
 * The video files are Pexels' free-licence CDN clips, checked to return a real
 * `video/mp4` rather than a redirect to a login wall -- the previous set had
 * started answering 403, which is why the reels tab was showing a frozen
 * thumbnail and no video. `thumbnail_url` is the poster frame, so a slow
 * connection still gets an image instead of a black rectangle.
 *
 * Captions describe the demo, not real families. `seed_social.sql` loads the
 * same rows into the database so the tab reads from Supabase like everything
 * else; this array is the fallback for a build with no credentials.
 */
export const INITIAL_REELS: SocialReel[] = [
  {
    id: "reel-1",
    author_name: "Elena & Leo",
    author_role: "Caregiver Story",
    condition: "STXBP1",
    title: "Morning sensory routine that changed our day",
    caption: "Deep pressure weighted blanket + 5 min low-stimulation transition before school.",
    video_url: "https://videos.pexels.com/video-files/4267867/4267867-sd_640_360_30fps.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=600&q=80",
    duration: "0:42",
    tags: ["#SensoryDiet", "#MorningRoutine", "#STXBP1"],
    likes_count: 142,
    created_at: "1 day ago",
  },
  {
    id: "reel-2",
    author_name: "Marcus Vance",
    author_role: "Dad of 7yo",
    condition: "SNARE Pathway",
    title: "How we track seizure clusters in real-time",
    caption:
      "Our setup for syncing wearable logs with clinical visit notes. No spreadsheets required.",
    video_url: "https://videos.pexels.com/video-files/8208434/8208434-sd_640_360_30fps.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=600&q=80",
    duration: "1:05",
    tags: ["#SeizureTracking", "#CaregiverTips", "#DigitalHealth"],
    likes_count: 98,
    created_at: "3 days ago",
  },
  {
    id: "reel-3",
    author_name: "Dr. Kwesi Osei",
    author_role: "Clinical Geneticist",
    condition: "Presynaptic Vesicle Fusion",
    title: "What does 'SNARE complex' mean for your child?",
    caption: "30-second primer on vesicle fusion biology in plain English without jargon.",
    video_url: "https://videos.pexels.com/video-files/7331152/7331152-sd_640_360_25fps.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80",
    duration: "0:38",
    tags: ["#BiologyExplained", "#ScienceForFamilies", "#NeuroGenetics"],
    likes_count: 310,
    created_at: "4 days ago",
  },
  {
    id: "reel-4",
    author_name: "Priya & Aanya",
    author_role: "Caregiver Story",
    condition: "SCN2A",
    title: "Our first week with an AAC device",
    caption:
      "What we got wrong, what finally clicked, and the three buttons Aanya reached for first.",
    video_url: "https://videos.pexels.com/video-files/6296764/6296764-sd_640_360_25fps.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&q=80",
    duration: "1:12",
    tags: ["#AACDevices", "#Communication", "#SCN2A"],
    likes_count: 176,
    created_at: "5 days ago",
  },
  {
    id: "reel-5",
    author_name: "The SNARE Circle",
    author_role: "Moderated Circle",
    condition: "SNARE Complex Disorders",
    title: "Packing for a hospital stay, from families who have done it",
    caption:
      "The crowd-sourced list: comfort items, the medication binder, and what the ward never has.",
    video_url: "https://videos.pexels.com/video-files/6181457/6181457-sd_640_360_25fps.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80",
    duration: "0:55",
    tags: ["#HospitalPrep", "#PeerWisdom", "#CommunityCircle"],
    likes_count: 204,
    created_at: "1 week ago",
  },
  {
    id: "reel-6",
    author_name: "Sarah Jenkins",
    author_role: "Mum of 5yo",
    condition: "KCNQ2",
    title: "Sleep, after four years of none",
    caption:
      "The routine our sleep clinic built with us, and the honest version of how long it took.",
    video_url: "https://videos.pexels.com/video-files/7456460/7456460-sd_640_360_30fps.mp4",
    thumbnail_url:
      "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=600&q=80",
    duration: "1:20",
    tags: ["#SleepRoutine", "#KCNQ2", "#CaregiverWins"],
    likes_count: 261,
    created_at: "1 week ago",
  },
];

export const STORIES: StoryUser[] = [
  {
    id: "s-1",
    name: "The SNARE Circle",
    condition: "14 Families",
    avatar_url:
      "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=150&q=80",
    has_unseen: true,
    reel_id: "reel-1",
  },
  {
    id: "s-2",
    name: "Elena M.",
    condition: "STXBP1",
    avatar_url:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    has_unseen: true,
    reel_id: "reel-1",
  },
  {
    id: "s-3",
    name: "Marcus V.",
    condition: "STX1B",
    avatar_url:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
    has_unseen: false,
    reel_id: "reel-2",
  },
  {
    id: "s-4",
    name: "Dr. Osei",
    condition: "Reviewer",
    avatar_url:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80",
    has_unseen: true,
    reel_id: "reel-3",
  },
  {
    id: "s-5",
    name: "Foundation",
    condition: "Steward",
    avatar_url:
      "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=150&q=80",
    has_unseen: false,
    reel_id: "reel-2",
  },
];

/* ------------------------------------------------------------------ *
 * Live data
 *
 * Posts, likes, comments and reels are real rows in Supabase (migrations
 * 20261003000018_social_feed.sql and 20261004000021_social_feed_circle_privacy.sql).
 * A post with `circle_id: null` is public to the signed-in community; a post
 * with a circle_id is readable only by that circle's active members and
 * steward, and a comment or like inherits whichever one its post is. You may
 * only write your own post, your own like and your own comment, and only
 * into a circle you actually belong to.
 *
 * Likes and comments used to live in React state only, so a heart vanished on
 * reload and nobody else ever saw it. They are now rows, which is what makes
 * this a network rather than a mock-up.
 *
 * The curated arrays above remain the fallback for a build with no Supabase
 * credentials, and for a brand-new project whose feed is still empty -- an
 * empty social network teaches a visitor nothing.
 * ------------------------------------------------------------------ */

type PostRow = {
  id: string;
  author_id: string | null;
  author_name: string | null;
  author_role: string | null;
  condition: string | null;
  biology_badge: string | null;
  body: string;
  image_url: string | null;
  tags: string[] | null;
  evidence_badge: string | null;
  evidence_link: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
  circle_id: string | null;
  /** Embedded via the circle_id FK (`.select("*, circles(name)")`); absent
   *  entirely on a public post, where circle_id is null. */
  circles: { name: string } | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  /** Null on seeded circle comments, which belong to no single account. */
  user_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

type ReelRow = {
  id: string;
  author_name: string;
  author_role: string;
  condition: string;
  title: string;
  caption: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: string | null;
  tags: string[] | null;
  likes_count: number | null;
  created_at: string;
};

const ROLES = ["Caregiver", "Patient", "Steward", "Clinician"] as const;

function asRole(value: string | null): SocialPost["author_role"] {
  return (ROLES as readonly string[]).includes(value ?? "")
    ? (value as SocialPost["author_role"])
    : "Caregiver";
}

/**
 * "3 hours ago" reads better than a timestamp in a feed, and it is the one
 * place a relative label is honest -- the row carries the real instant.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const seconds = Math.round((now.getTime() - then) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return new Date(then).toLocaleDateString();
}

function toPost(row: PostRow, comments: SocialComment[], liked: boolean): SocialPost {
  return {
    id: row.id,
    author_id: row.author_id ?? "community",
    author_name: row.author_name ?? "Community Member",
    author_role: asRole(row.author_role),
    condition: row.condition ?? "Rare Disorder",
    biology_badge: row.biology_badge ?? undefined,
    body: row.body,
    image_url: row.image_url,
    tags: row.tags ?? [],
    evidence_badge: row.evidence_badge,
    evidence_link: row.evidence_link,
    likes_count: row.likes_count ?? 0,
    comments_count: row.comments_count ?? 0,
    has_liked: liked,
    created_at: relativeTime(row.created_at),
    comments,
    circle_id: row.circle_id,
    circle_name: row.circles?.name ?? null,
  };
}

/**
 * Loads the feed with its comments and this viewer's likes, so a post arrives
 * already knowing whether the heart is filled. Three queries, not one per post.
 */
export async function fetchSocialPosts(): Promise<SocialPost[]> {
  const client = getSupabaseBrowser();
  if (!client) return INITIAL_POSTS;

  try {
    const { data, error } = await client
      .from("posts")
      .select("*, circles(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) return INITIAL_POSTS;

    const rows = data as PostRow[];
    const ids = rows.map((r) => r.id);
    const user = await currentUser();

    const [commentsResult, likesResult] = await Promise.all([
      client
        .from("post_comments")
        .select("*")
        .in("post_id", ids)
        .order("created_at", { ascending: true }),
      user
        ? client.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", ids)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
    ]);

    const byPost = new Map<string, SocialComment[]>();
    for (const row of (commentsResult.data ?? []) as CommentRow[]) {
      const list = byPost.get(row.post_id) ?? [];
      list.push({
        id: row.id,
        post_id: row.post_id,
        user_id: row.user_id ?? "community",
        author_name: row.author_name,
        body: row.body,
        created_at: relativeTime(row.created_at),
      });
      byPost.set(row.post_id, list);
    }

    const likedIds = new Set(
      ((likesResult.data ?? []) as { post_id: string }[]).map((r) => r.post_id),
    );

    return rows.map((row) => toPost(row, byPost.get(row.id) ?? [], likedIds.has(row.id)));
  } catch {
    return INITIAL_POSTS;
  }
}

/**
 * Publishes a post and returns the stored row, so the id in the UI is the id
 * in the database and a like placed a second later lands on the right post.
 *
 * This used to fall back to a `local-*` post that was never written anywhere
 * and rendered exactly like a published one -- a draft that only looked
 * posted, in a product whose composer tells people they're sharing with
 * their circle. It now throws instead: the caller is responsible for showing
 * that the write did not happen, not for quietly pretending it did.
 *
 * @param circleId The circle to post into, or `null` to post publicly to the
 *   signed-in community. The caller must have already confirmed this is a
 *   deliberate choice (see CreatePostBox) -- the database re-checks active
 *   membership regardless (20261004000021_social_feed_circle_privacy.sql).
 */
export async function publishPost(
  body: string,
  tags: string[] = [],
  imageUrl: string | undefined,
  evidenceBadge: string | undefined,
  circleId: string | null,
): Promise<SocialPost> {
  const client = getSupabaseBrowser();
  if (!client) throw new Error("Posting needs a configured Supabase connection.");

  const user = await currentUser();
  if (!user) throw new Error("Sign in to post.");

  const authorName = user.email?.split("@")[0] ?? "Caregiver";

  const { data, error } = await client
    .from("posts")
    .insert({
      author_id: user.id,
      author_name: authorName,
      author_role: "Caregiver",
      condition: "STXBP1 / Related Disorder",
      body,
      image_url: imageUrl ?? null,
      tags,
      evidence_badge: evidenceBadge ?? null,
      circle_id: circleId,
    })
    .select("*, circles(name)")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "That post could not be saved.");
  }
  return toPost(data as PostRow, [], false);
}

/**
 * Adds or removes this viewer's like and returns the stored state.
 *
 * `likes_count` on the post is kept in step here rather than by a trigger, so a
 * failure to write the counter cannot roll back the like itself; the row in
 * `post_likes` is the source of truth and the counter is a cache of it.
 */
export async function toggleLike(
  postId: string,
  currentlyLiked: boolean,
  currentCount: number,
): Promise<{ liked: boolean; count: number }> {
  const next = {
    liked: !currentlyLiked,
    count: Math.max(0, currentCount + (currentlyLiked ? -1 : 1)),
  };

  const client = getSupabaseBrowser();
  const user = await currentUser();
  // Curated demo rows have no database id to point a like at.
  if (!client || !user || postId.startsWith("post-") || postId.startsWith("local-")) return next;

  try {
    if (currentlyLiked) {
      await client.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await client.from("post_likes").insert({ post_id: postId, user_id: user.id });
    }
    await client.from("posts").update({ likes_count: next.count }).eq("id", postId);
  } catch {
    // The optimistic value still stands; the next fetch reconciles it.
  }

  return next;
}

/** Stores a comment and returns it with the id the database gave it. */
export async function addComment(postId: string, body: string): Promise<SocialComment> {
  const client = getSupabaseBrowser();
  const user = await currentUser();
  const authorName = user?.email?.split("@")[0] ?? "You";

  const local: SocialComment = {
    id: `local-c-${Date.now()}`,
    post_id: postId,
    user_id: user?.id ?? "me",
    author_name: authorName,
    body,
    created_at: "Just now",
  };

  if (!client || !user || postId.startsWith("post-") || postId.startsWith("local-")) return local;

  try {
    const { data, error } = await client
      .from("post_comments")
      .insert({ post_id: postId, user_id: user.id, author_name: authorName, body })
      .select()
      .single();
    if (error || !data) return local;

    const row = data as CommentRow;
    const { count } = await client
      .from("post_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);
    if (typeof count === "number") {
      await client.from("posts").update({ comments_count: count }).eq("id", postId);
    }

    return {
      id: row.id,
      post_id: row.post_id,
      user_id: row.user_id ?? "community",
      author_name: row.author_name,
      body: row.body,
      created_at: "Just now",
    };
  } catch {
    return local;
  }
}

/** Reels from the database, falling back to the curated set. */
export async function fetchReels(): Promise<SocialReel[]> {
  const client = getSupabaseBrowser();
  if (!client) return INITIAL_REELS;

  try {
    const { data, error } = await client
      .from("reels")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !data || data.length === 0) return INITIAL_REELS;

    return (data as ReelRow[])
      .filter((row) => row.video_url)
      .map((row) => ({
        id: row.id,
        author_name: row.author_name,
        author_role: row.author_role,
        condition: row.condition,
        title: row.title,
        caption: row.caption,
        video_url: row.video_url as string,
        thumbnail_url: row.thumbnail_url ?? "",
        duration: row.duration ?? "0:45",
        tags: row.tags ?? [],
        likes_count: row.likes_count ?? 0,
        created_at: relativeTime(row.created_at),
      }));
  } catch {
    return INITIAL_REELS;
  }
}

/**
 * Streams other people's posts and comments into the open feed.
 *
 * Both subscriptions share one channel so a viewer holds a single socket. The
 * post callback skips rows this viewer wrote, which the publish path has
 * already shown them optimistically.
 */
export function subscribeToFeed({
  viewerId,
  onNewPost,
  onNewComment,
}: {
  viewerId: string | null;
  onNewPost: (post: SocialPost) => void;
  onNewComment: (comment: SocialComment) => void;
}) {
  const client = getSupabaseBrowser();
  if (!client) return () => {};

  const channel = client
    .channel("realtime-social-feed")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
      const row = payload.new as PostRow;
      if (viewerId && row.author_id === viewerId) return;
      onNewPost(toPost(row, [], false));
    })
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "post_comments" },
      (payload) => {
        const row = payload.new as CommentRow;
        if (viewerId && row.user_id === viewerId) return;
        onNewComment({
          id: row.id,
          post_id: row.post_id,
          user_id: row.user_id ?? "community",
          author_name: row.author_name,
          body: row.body,
          created_at: "Just now",
        });
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
