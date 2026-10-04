import * as React from "react";
import { Heart, MessageCircle, Music, Play, Send, Share2, Volume2, VolumeX } from "lucide-react";
import { INITIAL_REELS, type SocialReel } from "@/lib/social-feed";

export function ReelsFeed() {
  const [activeReelIndex, setActiveReelIndex] = React.useState(0);
  const [likes, setLikes] = React.useState<Record<string, { count: number; active: boolean }>>({
    "reel-1": { count: 142, active: false },
    "reel-2": { count: 98, active: false },
    "reel-3": { count: 310, active: false },
  });
  const [muted, setMuted] = React.useState(true);

  const toggleLike = (id: string) => {
    setLikes((prev) => {
      const current = prev[id] || { count: 0, active: false };
      return {
        ...prev,
        [id]: {
          count: current.active ? current.count - 1 : current.count + 1,
          active: !current.active,
        },
      };
    });
  };

  return (
    <div className="mx-auto max-w-md py-4 space-y-8">
      <div className="text-center mb-6">
        <h2 className="font-display text-3xl">Caregiver & Patient Reels</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Lived experience micro-stories, seizure management tips, and daily milestones.
        </p>
      </div>

      <div className="space-y-8">
        {INITIAL_REELS.map((reel) => {
          const reelLike = likes[reel.id] || { count: reel.likes_count, active: false };

          return (
            <div
              key={reel.id}
              className="relative overflow-hidden rounded-3xl border border-border bg-black shadow-xl aspect-[9/16] max-h-[640px] flex flex-col justify-end text-white"
            >
              {/* Background Video/Image Preview */}
              <img
                src={reel.thumbnail_url}
                alt={reel.title}
                className="absolute inset-0 size-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

              {/* Top Controls */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMuted(!muted)}
                  className="size-8 rounded-full bg-black/50 backdrop-blur-md grid place-items-center text-white/90 hover:text-white"
                  aria-label="Toggle mute"
                >
                  {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
              </div>

              {/* Floating Action Bar (Right side) */}
              <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-5">
                <button
                  type="button"
                  onClick={() => toggleLike(reel.id)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`size-10 rounded-full bg-black/40 backdrop-blur-md grid place-items-center transition-transform active:scale-125 ${
                      reelLike.active ? "text-rose-500" : "text-white"
                    }`}
                  >
                    <Heart className={`size-5 ${reelLike.active ? "fill-current" : ""}`} />
                  </div>
                  <span className="text-[11px] font-medium text-white/90">{reelLike.count}</span>
                </button>

                <button
                  type="button"
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="size-10 rounded-full bg-black/40 backdrop-blur-md grid place-items-center text-white">
                    <MessageCircle className="size-5" />
                  </div>
                  <span className="text-[11px] font-medium text-white/90">18</span>
                </button>

                <button
                  type="button"
                  className="flex flex-col items-center gap-1 group"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: reel.title, text: reel.caption }).catch(() => {});
                    }
                  }}
                >
                  <div className="size-10 rounded-full bg-black/40 backdrop-blur-md grid place-items-center text-white">
                    <Share2 className="size-5" />
                  </div>
                  <span className="text-[11px] font-medium text-white/90">Share</span>
                </button>
              </div>

              {/* Reel Metadata & Caption (Bottom Left) */}
              <div className="relative z-10 p-5 pr-16 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 grid place-items-center text-xs font-bold text-white border border-white/30">
                    {reel.author_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-sm drop-shadow">{reel.author_name}</span>
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] backdrop-blur-sm">
                      {reel.author_role}
                    </span>
                  </div>
                </div>

                <p className="font-semibold text-sm leading-snug drop-shadow">{reel.title}</p>
                <p className="text-xs text-white/90 leading-relaxed line-clamp-2">{reel.caption}</p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {reel.tags.map((tag) => (
                    <span key={tag} className="text-[11px] font-medium text-rose-300">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-white/70 pt-1">
                  <Music className="size-3 animate-spin text-white/80" />
                  <span>Original audio • Caregiver soundbite</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
