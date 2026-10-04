import * as React from "react";
import {
  Heart,
  Loader2,
  MessageCircle,
  Music,
  Pause,
  Play,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";

import { fetchReels, type SocialReel } from "@/lib/social-feed";

/**
 * The reels tab.
 *
 * It used to render `reel.thumbnail_url` in an `<img>` and never touch
 * `video_url`, so every "reel" was a still photograph with a play button drawn
 * on it. These are real `<video>` elements now: muted, looping and inline, so
 * they behave the way a phone expects and autoplay is allowed to start.
 *
 * Only the clip in view plays. An IntersectionObserver starts the visible one
 * and pauses the rest, which keeps a six-reel page from pulling six video
 * streams at once over a hospital's wifi.
 */
export function ReelsFeed() {
  const [reels, setReels] = React.useState<SocialReel[] | null>(null);
  const [muted, setMuted] = React.useState(true);
  const [likes, setLikes] = React.useState<Record<string, { count: number; active: boolean }>>({});

  React.useEffect(() => {
    let cancelled = false;
    void fetchReels().then((loaded) => {
      if (cancelled) return;
      setReels(loaded);
      setLikes(
        Object.fromEntries(loaded.map((r) => [r.id, { count: r.likes_count, active: false }])),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleLike = (id: string, fallback: number) => {
    setLikes((prev) => {
      const current = prev[id] ?? { count: fallback, active: false };
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
    <div className="mx-auto max-w-md space-y-8 py-4">
      <div className="mb-6 text-center">
        <h2 className="font-display text-3xl">Caregiver & Patient Reels</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Lived experience micro-stories, seizure management tips, and daily milestones.
        </p>
      </div>

      {reels === null && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" /> Loading reels…
        </p>
      )}

      <div className="space-y-8">
        {(reels ?? []).map((reel) => (
          <Reel
            key={reel.id}
            reel={reel}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            like={likes[reel.id] ?? { count: reel.likes_count, active: false }}
            onToggleLike={() => toggleLike(reel.id, reel.likes_count)}
          />
        ))}
      </div>

      {reels !== null && reels.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No reels have been shared yet.
        </p>
      )}
    </div>
  );
}

function Reel({
  reel,
  muted,
  onToggleMute,
  like,
  onToggleLike,
}: {
  reel: SocialReel;
  muted: boolean;
  onToggleMute: () => void;
  like: { count: number; active: boolean };
  onToggleLike: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  // Play only while at least half the card is on screen.
  React.useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          // A rejected play() is normal: some browsers refuse autoplay until
          // the viewer has interacted with the page. The tap-to-play overlay
          // stays available for exactly that case.
          void element.play().catch(() => {});
        } else {
          element.pause();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => {});
    else element.pause();
  };

  return (
    <div className="relative flex aspect-[9/16] max-h-[640px] flex-col justify-end overflow-hidden rounded-3xl border border-border bg-black text-white shadow-xl">
      {failed ? (
        <img
          src={reel.thumbnail_url}
          alt={reel.title}
          className="absolute inset-0 size-full object-cover opacity-90"
        />
      ) : (
        <video
          ref={videoRef}
          src={reel.video_url}
          poster={reel.thumbnail_url || undefined}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Tap anywhere to play or pause, the way a reel behaves on a phone. */}
      <button
        type="button"
        onClick={togglePlay}
        className="absolute inset-0 z-[5] grid place-items-center focus:outline-none"
        aria-label={playing ? `Pause ${reel.title}` : `Play ${reel.title}`}
      >
        {!playing && !failed && (
          <span className="grid size-16 place-items-center rounded-full bg-black/45 backdrop-blur-md">
            <Play className="size-7 translate-x-0.5 fill-current text-white" />
          </span>
        )}
      </button>

      <div className="absolute right-4 top-4 z-10 flex gap-2">
        {playing && (
          <span className="grid size-8 place-items-center rounded-full bg-black/50 text-white/80 backdrop-blur-md">
            <Pause className="size-3.5" aria-hidden="true" />
          </span>
        )}
        <button
          type="button"
          onClick={onToggleMute}
          className="grid size-8 place-items-center rounded-full bg-black/50 text-white/90 backdrop-blur-md hover:text-white"
          aria-label={muted ? "Unmute reels" : "Mute reels"}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-5">
        <button
          type="button"
          onClick={onToggleLike}
          className="group flex flex-col items-center gap-1"
        >
          <span
            className={`grid size-10 place-items-center rounded-full bg-black/40 backdrop-blur-md transition-transform active:scale-125 ${
              like.active ? "text-rose-500" : "text-white"
            }`}
          >
            <Heart className={`size-5 ${like.active ? "fill-current" : ""}`} />
          </span>
          <span className="text-[11px] font-medium text-white/90">{like.count}</span>
        </button>

        <span className="flex flex-col items-center gap-1">
          <span className="grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md">
            <MessageCircle className="size-5" />
          </span>
          <span className="text-[11px] font-medium text-white/90">Reply</span>
        </span>

        <button
          type="button"
          className="group flex flex-col items-center gap-1"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: reel.title, text: reel.caption }).catch(() => {});
            }
          }}
        >
          <span className="grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md">
            <Share2 className="size-5" />
          </span>
          <span className="text-[11px] font-medium text-white/90">Share</span>
        </button>
      </div>

      <div className="relative z-10 space-y-2.5 p-5 pr-16">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full border border-white/30 bg-gradient-to-tr from-amber-500 to-rose-500 text-xs font-bold text-white">
            {reel.author_name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <span className="text-sm font-semibold drop-shadow">{reel.author_name}</span>
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] backdrop-blur-sm">
              {reel.author_role}
            </span>
          </div>
        </div>

        <p className="text-sm font-semibold leading-snug drop-shadow">{reel.title}</p>
        <p className="line-clamp-2 text-xs leading-relaxed text-white/90">{reel.caption}</p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {reel.tags.map((tag) => (
            <span key={tag} className="text-[11px] font-medium text-rose-300">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1 text-[10px] text-white/70">
          <Music className="size-3 text-white/80" />
          <span>
            {reel.condition} · {reel.duration}
          </span>
        </div>
      </div>
    </div>
  );
}
