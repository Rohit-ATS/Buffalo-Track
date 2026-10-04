-- 20261004000021_social_feed_circle_privacy.sql
--
-- 0018 made every post, comment, like, and reel readable by any authenticated
-- account (`for select to authenticated using (true)`), while the composer's
-- own copy told the person writing it "Connected Circle Only." Those two
-- things disagreed: nothing in the schema ever checked circle membership.
-- An unrelated signed-in account could read every family's posts, comments,
-- and reels, and subscribe to all of it in real time.
--
-- This migration gives posts and reels a real circle boundary and makes the
-- database match what the composer already claimed.
--
-- Model: `circle_id is null` means "public to the signed-in community" --
-- the same reach every row already had before this migration, so nothing
-- that already exists becomes more exposed. `circle_id` set means private to
-- that circle's active members (and its steward), enforced the same way
-- `circle_messages` already is (20261003000012_family_network.sql). A post
-- chooses one of the two explicitly; there is no default that silently
-- broadens reach later.

alter table public.posts add column if not exists circle_id uuid references public.circles(id) on delete cascade;
alter table public.reels add column if not exists circle_id uuid references public.circles(id) on delete cascade;

create index if not exists posts_circle_id_idx on public.posts (circle_id);
create index if not exists reels_circle_id_idx on public.reels (circle_id);

-- Every comment and like inherits the privacy of the post it belongs to --
-- never set independently, so the two can't drift apart.
create or replace function public.can_read_post(target_post uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts p
    where p.id = target_post
      and (p.circle_id is null or public.is_circle_member(p.circle_id) or public.is_circle_steward(p.circle_id))
  )
$$;
revoke all on function public.can_read_post(uuid) from public;
grant execute on function public.can_read_post(uuid) to authenticated;

-- ------------------------------------------------------------------ posts
drop policy if exists "authenticated users read posts" on public.posts;
create policy "public posts or own circle are readable" on public.posts
  for select to authenticated
  using (circle_id is null or public.is_circle_member(circle_id) or public.is_circle_steward(circle_id));

drop policy if exists "authors insert own posts" on public.posts;
create policy "authors post to their own circle or publicly" on public.posts
  for insert to authenticated
  with check (author_id = auth.uid() and (circle_id is null or public.is_circle_member(circle_id)));

-- Update already required `author_id = auth.uid()`; add the same bound on the
-- row being written so an author can't move a post they still own into a
-- circle they don't belong to.
drop policy if exists "authors update own posts" on public.posts;
create policy "authors update own posts" on public.posts
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and (circle_id is null or public.is_circle_member(circle_id)));

-- Authors keep deleting their own posts (0018). A steward may additionally
-- remove a post inside a circle they steward -- moderation, not authorship --
-- and nothing wider: a steward still cannot edit someone else's words, and
-- still cannot touch a post outside their own circle.
drop policy if exists "stewards moderate posts in their circle" on public.posts;
create policy "stewards moderate posts in their circle" on public.posts
  for delete to authenticated
  using (circle_id is not null and public.is_circle_steward(circle_id));

-- ------------------------------------------------------------------ comments
drop policy if exists "authenticated users read comments" on public.post_comments;
create policy "comments are readable where the post is" on public.post_comments
  for select to authenticated
  using (public.can_read_post(post_id));

drop policy if exists "users insert comments" on public.post_comments;
create policy "users comment where they can already read" on public.post_comments
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_read_post(post_id));

drop policy if exists "authors delete own comments" on public.post_comments;
create policy "authors delete own comments" on public.post_comments
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "stewards moderate comments in their circle" on public.post_comments;
create policy "stewards moderate comments in their circle" on public.post_comments
  for delete to authenticated
  using (exists (
    select 1 from public.posts p
    where p.id = post_comments.post_id
      and p.circle_id is not null
      and public.is_circle_steward(p.circle_id)
  ));

-- ------------------------------------------------------------------ likes
drop policy if exists "authenticated users read likes" on public.post_likes;
create policy "likes are readable where the post is" on public.post_likes
  for select to authenticated
  using (public.can_read_post(post_id));

drop policy if exists "users manage own likes" on public.post_likes;
create policy "users like where they can already read" on public.post_likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_read_post(post_id));
-- "users delete own likes" (0018) is unchanged: unliking never needed read access.

-- ------------------------------------------------------------------ reels
drop policy if exists "authenticated users read reels" on public.reels;
create policy "public reels or own circle are readable" on public.reels
  for select to authenticated
  using (circle_id is null or public.is_circle_member(circle_id) or public.is_circle_steward(circle_id));

drop policy if exists "authenticated users insert reels" on public.reels;
create policy "authors post reels to their own circle or publicly" on public.reels
  for insert to authenticated
  with check (author_id = auth.uid() and (circle_id is null or public.is_circle_member(circle_id)));

drop policy if exists "authors delete own reels" on public.reels;
create policy "authors delete own reels" on public.reels
  for delete to authenticated
  using (author_id = auth.uid());

drop policy if exists "stewards moderate reels in their circle" on public.reels;
create policy "stewards moderate reels in their circle" on public.reels
  for delete to authenticated
  using (circle_id is not null and public.is_circle_steward(circle_id));

-- ------------------------------------------------------------------ realtime
-- No publication change needed: Supabase's `postgres_changes` already
-- evaluates each subscriber's own SELECT policies before delivering a change
-- (this is why 20261003000012's circle_messages realtime never needed its
-- own carve-out either), so tightening SELECT above is what scopes the
-- live feed, not a separate realtime setting. Confirm this against the
-- project's own Realtime "Row Level Security" toggle before relying on it --
-- it must be left on (the default) for this to hold.
