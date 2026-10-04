import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { currentUser } from "@/lib/family-network";

export type SocialPost = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: "Caregiver" | "Patient" | "Steward" | "Clinician";
  condition: string;
  biology_badge?: string;
  body: string;
  image_url?: string | null;
  tags: string[];
  evidence_badge?: string | null;
  evidence_link?: string | null;
  likes_count: number;
  comments_count: number;
  has_liked?: boolean;
  created_at: string;
  comments?: SocialComment[];
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
    author_id: "user-elena",
    author_name: "Elena Rostova",
    author_role: "Caregiver",
    condition: "STXBP1 Encephalopathy",
    biology_badge: "Presynaptic Vesicle Fusion",
    body: "Milestone day for our family! After 6 months of systematic seizure tracking with our pediatric neurologist, Leo went 45 days without a focal seizure cluster. To any parents just starting this journey: keeping an hourly sleep and meal log made all the difference in spotting triggers. You are not alone in this.",
    image_url: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=80",
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
];

export const INITIAL_REELS: SocialReel[] = [
  {
    id: "reel-1",
    author_name: "Elena & Leo",
    author_role: "Caregiver Story",
    condition: "STXBP1",
    title: "Morning sensory routine that changed our day",
    caption: "Deep pressure weighted blanket + 5 min low-stimulation transition before school.",
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-mother-and-child-42358-large.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=600&q=80",
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
    caption: "Our setup for syncing wearable logs with clinical visit notes. No spreadsheets required.",
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-father-and-son-playing-in-a-park-41584-large.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=600&q=80",
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
    video_url: "https://assets.mixkit.co/videos/preview/mixkit-doctor-explaining-a-diagnosis-42385-large.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80",
    duration: "0:38",
    tags: ["#BiologyExplained", "#ScienceForFamilies", "#NeuroGenetics"],
    likes_count: 310,
    created_at: "4 days ago",
  },
];

export const STORIES: StoryUser[] = [
  {
    id: "s-1",
    name: "The SNARE Circle",
    condition: "14 Families",
    avatar_url: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=150&q=80",
    has_unseen: true,
    reel_id: "reel-1",
  },
  {
    id: "s-2",
    name: "Elena M.",
    condition: "STXBP1",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    has_unseen: true,
    reel_id: "reel-1",
  },
  {
    id: "s-3",
    name: "Marcus V.",
    condition: "STX1B",
    avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
    has_unseen: false,
    reel_id: "reel-2",
  },
  {
    id: "s-4",
    name: "Dr. Osei",
    condition: "Reviewer",
    avatar_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80",
    has_unseen: true,
    reel_id: "reel-3",
  },
  {
    id: "s-5",
    name: "Foundation",
    condition: "Steward",
    avatar_url: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=150&q=80",
    has_unseen: false,
    reel_id: "reel-2",
  },
];

// Helper to fetch posts from Supabase or fallback
export async function fetchSocialPosts(): Promise<SocialPost[]> {
  const client = getSupabaseBrowser();
  if (!client) return INITIAL_POSTS;

  try {
    const { data, error } = await client
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) {
      return INITIAL_POSTS;
    }

    return (data as any[]).map((p) => ({
      id: p.id,
      author_id: p.author_id,
      author_name: p.author_name || "Community Member",
      author_role: (p.author_role as any) || "Caregiver",
      condition: p.condition || "Rare Disorder",
      biology_badge: p.biology_badge || undefined,
      body: p.body,
      image_url: p.image_url,
      tags: p.tags || [],
      evidence_badge: p.evidence_badge,
      evidence_link: p.evidence_link,
      likes_count: p.likes_count || 0,
      comments_count: p.comments_count || 0,
      has_liked: false,
      created_at: new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      comments: [],
    }));
  } catch {
    return INITIAL_POSTS;
  }
}

// Publish post to Supabase
export async function publishPost(
  body: string,
  tags: string[] = [],
  imageUrl?: string,
  evidenceBadge?: string,
): Promise<SocialPost> {
  const client = getSupabaseBrowser();
  const user = await currentUser();

  const authorName = user?.email?.split("@")[0] || "Caregiver";
  const newPost: SocialPost = {
    id: `post-${Date.now()}`,
    author_id: user?.id || "anon-user",
    author_name: authorName,
    author_role: "Caregiver",
    condition: "STXBP1 / Related Disorder",
    biology_badge: "Presynaptic Vesicle Fusion",
    body,
    image_url: imageUrl,
    tags,
    evidence_badge: evidenceBadge,
    likes_count: 0,
    comments_count: 0,
    has_liked: false,
    created_at: "Just now",
    comments: [],
  };

  if (client && user) {
    try {
      await client.from("posts").insert({
        author_id: user.id,
        author_name: authorName,
        condition: newPost.condition,
        body,
        image_url: imageUrl,
        tags,
        evidence_badge: evidenceBadge,
      });
    } catch (e) {
      console.warn("Published to local optimistic feed:", e);
    }
  }

  return newPost;
}

// Real-time listener for posts
export function subscribeToPosts(onNewPost: (post: SocialPost) => void) {
  const client = getSupabaseBrowser();
  if (!client) return () => {};

  const channel = client
    .channel("realtime-social-posts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts" },
      (payload) => {
        const p = payload.new as any;
        onNewPost({
          id: p.id,
          author_id: p.author_id,
          author_name: p.author_name || "Community Member",
          author_role: "Caregiver",
          condition: p.condition || "Rare Disorder",
          body: p.body,
          image_url: p.image_url,
          tags: p.tags || [],
          evidence_badge: p.evidence_badge,
          likes_count: p.likes_count || 0,
          comments_count: 0,
          created_at: "Just now",
        });
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
