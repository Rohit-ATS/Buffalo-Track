import * as React from "react";
import { Sparkles, Video } from "lucide-react";
import { STORIES, type StoryUser } from "@/lib/social-feed";

export function StoriesTray({ onSelectStory }: { onSelectStory: (story: StoryUser) => void }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <Sparkles className="size-3.5 text-primary" /> Caregiver Stories & Circles
        </span>
        <span className="text-[11px]">Real-time updates</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
        {STORIES.map((story) => (
          <button
            key={story.id}
            type="button"
            onClick={() => onSelectStory(story)}
            className="group flex flex-col items-center gap-1.5 focus:outline-none"
          >
            <div
              className={`relative size-16 rounded-full p-[2.5px] transition-transform duration-200 group-hover:scale-105 ${
                story.has_unseen
                  ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600"
                  : "border-2 border-border"
              }`}
            >
              <div className="size-full overflow-hidden rounded-full border-2 border-background bg-secondary">
                {story.avatar_url ? (
                  <img
                    src={story.avatar_url}
                    alt={story.name}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-xs font-bold text-primary">
                    {story.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="absolute bottom-0 right-0 grid size-4.5 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground shadow">
                <Video className="size-2.5" />
              </span>
            </div>
            <span className="w-16 truncate text-center text-[11px] font-medium leading-tight">
              {story.name}
            </span>
            <span className="w-16 truncate text-center text-[9px] text-muted-foreground">
              {story.condition}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
