-- 20261003000018_social_feed.sql
-- Real-time Social Network (Posts, Comments, Likes, Reels) for rare-disease families.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text,
  condition text,
  body text not null,
  image_url text,
  tags text[] default '{}',
  evidence_badge text,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  author_role text not null,
  condition text not null,
  title text not null,
  caption text not null,
  video_url text,
  thumbnail_url text,
  duration text not null default '0:45',
  tags text[] default '{}',
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.reels enable row level security;

-- Policies: Authenticated users can read public posts and create their own
drop policy if exists "authenticated users read posts" on public.posts;
create policy "authenticated users read posts" on public.posts
  for select to authenticated using (true);

drop policy if exists "authors insert own posts" on public.posts;
create policy "authors insert own posts" on public.posts
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists "authors update own posts" on public.posts;
create policy "authors update own posts" on public.posts
  for update to authenticated using (author_id = auth.uid());

drop policy if exists "authors delete own posts" on public.posts;
create policy "authors delete own posts" on public.posts
  for delete to authenticated using (author_id = auth.uid());

-- Likes policies
drop policy if exists "authenticated users read likes" on public.post_likes;
create policy "authenticated users read likes" on public.post_likes
  for select to authenticated using (true);

drop policy if exists "users manage own likes" on public.post_likes;
create policy "users manage own likes" on public.post_likes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "users delete own likes" on public.post_likes;
create policy "users delete own likes" on public.post_likes
  for delete to authenticated using (user_id = auth.uid());

-- Comments policies
drop policy if exists "authenticated users read comments" on public.post_comments;
create policy "authenticated users read comments" on public.post_comments
  for select to authenticated using (true);

drop policy if exists "users insert comments" on public.post_comments;
create policy "users insert comments" on public.post_comments
  for insert to authenticated with check (user_id = auth.uid());

-- Reels policies
drop policy if exists "authenticated users read reels" on public.reels;
create policy "authenticated users read reels" on public.reels
  for select to authenticated using (true);

drop policy if exists "authenticated users insert reels" on public.reels;
create policy "authenticated users insert reels" on public.reels
  for insert to authenticated with check (author_id = auth.uid());

-- Enable Realtime publication
do $$
begin
  alter publication supabase_realtime add table public.posts;
  alter publication supabase_realtime add table public.post_likes;
  alter publication supabase_realtime add table public.post_comments;
  alter publication supabase_realtime add table public.reels;
exception when others then null;
end $$;
