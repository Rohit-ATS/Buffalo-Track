-- 20261004000019_social_feed_demo_content.sql
--
-- Two gaps between 0018 and what the app reads.
--
-- 1. The feed renders an author's role, the biology badge on a post, and a link
--    behind an evidence badge. None of those were columns, so every post came
--    back missing them and the UI silently fell back to "Caregiver".
--
-- 2. Curated community posts (the seeded demo set, and anything a steward
--    publishes on behalf of a circle) have no auth.users row to point at.
--    `author_id` therefore has to be nullable. The insert policy still demands
--    `author_id = auth.uid()`, so a browser can never write one of these --
--    only the service role, running a seed, can.

alter table public.posts add column if not exists author_role text;
alter table public.posts add column if not exists biology_badge text;
alter table public.posts add column if not exists evidence_link text;
alter table public.posts alter column author_id drop not null;

-- Comments on a curated post belong to the circle, not to an account either.
-- The insert policy still requires `user_id = auth.uid()`, so only the service
-- role can write an authorless comment.
alter table public.post_comments alter column user_id drop not null;

-- Feeds are read newest-first and comments are read per post; without these
-- both queries are sequential scans once the demo set stops being three rows.
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);
create index if not exists reels_created_at_idx on public.reels (created_at desc);

-- 0018's policy for reels requires `author_id = auth.uid()`, which a curated
-- reel with a null author can never satisfy. Same reasoning as posts.
drop policy if exists "authenticated users insert reels" on public.reels;
create policy "authenticated users insert reels" on public.reels
  for insert to authenticated with check (author_id = auth.uid());
