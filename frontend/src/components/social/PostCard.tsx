import * as React from "react";
import {
  Bookmark,
  Globe2,
  Heart,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SocialPost } from "@/lib/social-feed";

export function PostCard({
  post,
  onLike,
  onComment,
}: {
  post: SocialPost;
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
}) {
  const [commentText, setCommentText] = React.useState("");
  const [showComments, setShowComments] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  /*
   * The like count and the comment list are read from `post`, not copied into
   * state here.
   *
   * They used to be copied, which was fine while both were make-believe. Now
   * that a like is a row and the parent reconciles it with what the database
   * actually stored, a local copy would keep showing the optimistic number
   * after the write failed -- and would miss a comment that arrived over the
   * realtime channel from someone else. One owner for the data, which is the
   * parent.
   */
  const liked = post.has_liked ?? false;
  const likesCount = post.likes_count;
  const comments = post.comments ?? [];

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    const body = commentText.trim();
    if (!body) return;
    onComment(post.id, body);
    setCommentText("");
    setShowComments(true);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="size-10 overflow-hidden rounded-full border border-primary/20 bg-gradient-to-tr from-primary/30 to-accent/30 grid place-items-center font-display font-semibold text-primary">
            {post.author_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm hover:underline cursor-pointer">
                {post.author_name}
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {post.author_role}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{post.condition}</span>
              <span>•</span>
              <span>{post.created_at}</span>
              <span>•</span>
              {/* Says exactly what the database will actually show to who --
                  see supabase/migrations/20261004000021_social_feed_circle_privacy.sql. */}
              <span className="flex items-center gap-1" title="Who can see this post">
                {post.circle_id ? (
                  <>
                    <Lock className="size-3" aria-hidden="true" />
                    {post.circle_name ? `${post.circle_name} only` : "Circle only"}
                  </>
                ) : (
                  <>
                    <Globe2 className="size-3" aria-hidden="true" />
                    Public
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {post.biology_badge && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-primary/30 bg-example-mint px-2.5 py-0.5 text-[10px] font-medium text-primary">
              <Sparkles className="size-2.5" />
              {post.biology_badge}
            </span>
          )}
          <button
            type="button"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary"
            aria-label="More options"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {/* Post Image if any */}
      {post.image_url && (
        <div className="relative aspect-video w-full overflow-hidden bg-secondary">
          <img
            src={post.image_url}
            alt={post.body.slice(0, 40)}
            className="size-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Post Content */}
      <div className="p-4 space-y-3">
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{post.body}</p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Evidence Card Attachment */}
        {post.evidence_badge && (
          <div className="rounded-xl border border-border/80 bg-background/80 p-3 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary shrink-0" />
              <span className="font-medium text-muted-foreground">
                Evidence: <strong className="text-foreground">{post.evidence_badge}</strong>
              </span>
            </div>
            {post.evidence_link && (
              <a
                href={post.evidence_link}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-primary underline shrink-0 hover:text-primary/80"
              >
                Inspect receipt
              </a>
            )}
          </div>
        )}

        {/* Action Bar (Instagram Style) */}
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 text-sm transition-transform active:scale-125 ${
                liked
                  ? "text-rose-500 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Like post"
            >
              <Heart className={`size-5 ${liked ? "fill-current" : ""}`} />
              <span className="text-xs">{likesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              aria-label="View comments"
            >
              <MessageCircle className="size-5" />
              <span className="text-xs">{comments.length}</span>
            </button>

            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Share post"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: post.author_name, text: post.body }).catch(() => {});
                }
              }}
            >
              <Send className="size-4.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSaved(!saved)}
            className={`text-sm transition-colors ${
              saved ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Save evidence to receipts"
          >
            <Bookmark className={`size-5 ${saved ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-3 space-y-2.5 border-t border-border/60 pt-3">
            {comments.map((comment) => (
              <div key={comment.id} className="text-xs space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-foreground">{comment.author_name}</span>
                  <span className="text-[10px] text-muted-foreground">{comment.created_at}</span>
                </div>
                <p className="text-muted-foreground">{comment.body}</p>
              </div>
            ))}

            {/* Comment Composer */}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a thoughtful reply to this circle…"
                className="flex-1 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                type="submit"
                disabled={!commentText.trim()}
                className="rounded-full text-xs h-7 px-3"
              >
                Post
              </Button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
