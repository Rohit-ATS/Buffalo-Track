-- supabase/tests/social_feed_privacy.sql
--
-- Three accounts, two circles, and every claim
-- 20261004000021_social_feed_circle_privacy.sql makes: a circle-private post,
-- comment, or like is invisible outside that circle, in both directions, and
-- an author can still only act as themselves.
--
-- How this differs from the rest of supabase/: this one is not "paste into
-- the SQL editor and eyeball the output" (that's verify.sql / smoke_test.sql).
-- Every check here is a `do $$ ... raise exception ... end $$` assertion, so
-- it either prints "ALL CHECKS PASSED" or fails loudly with the row it did
-- not expect. Nothing here was run against a live project from this session
-- -- this repo's rules bar changing production database state without
-- explicit approval, and the session's sandbox has no local Supabase/Docker
-- stack to run it against either. Run it yourself:
--
--   supabase start
--   psql postgresql://postgres:postgres@localhost:54322/postgres \
--     -v ON_ERROR_STOP=1 -f supabase/tests/social_feed_privacy.sql
--
-- It creates its own fixtures under fixed UUIDs and rolls everything back at
-- the end, so it is safe to run against a disposable local instance and to
-- run more than once.

begin;

-- ------------------------------------------------------------- fixtures
-- Three accounts. auth.users first (profiles.id FKs to it); as the `postgres`
-- superuser this bypasses RLS, which is correct for building fixtures -- the
-- assertions below are what actually exercises the policies.
-- instance_id's all-zero UUID is the standard local/self-hosted GoTrue
-- default; adjust if your project's auth schema needs something else.
insert into auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, aud, role)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a', 'a@test.local', 'x', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b', 'b@test.local', 'x', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000c', 'c@test.local', 'x', now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, matching_opt_in)
values
  ('00000000-0000-0000-0000-00000000000a', 'User A', false),
  ('00000000-0000-0000-0000-00000000000b', 'User B', false),
  ('00000000-0000-0000-0000-00000000000c', 'User C', false)
on conflict (id) do nothing;

insert into public.circles (id, name, steward_id, is_private)
values
  ('00000000-0000-0000-0000-0000000000ca', 'Circle A', '00000000-0000-0000-0000-00000000000a', true),
  ('00000000-0000-0000-0000-0000000000cb', 'Circle B', '00000000-0000-0000-0000-00000000000b', true)
on conflict (id) do nothing;

-- A is an active member of Circle A only. B is an active member of Circle B
-- only. C belongs to no circle -- the three-account matrix the review asked for.
insert into public.circle_members (circle_id, profile_id, status)
values
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-00000000000a', 'active'),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-00000000000b', 'active')
on conflict (circle_id, profile_id) do update set status = excluded.status;

-- A helper so each block below reads as "act as this person," matching how
-- PostgREST actually authenticates a request (it sets exactly these two
-- session GUCs from the caller's JWT before RLS ever evaluates).
create or replace function pg_temp.act_as(p_user uuid) returns void as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$ language plpgsql;

create or replace function pg_temp.act_as_owner() returns void as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$ language plpgsql;

-- A writes a private post into Circle A, a public post, a comment, and a like.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');

insert into public.posts (id, author_id, author_name, body, circle_id)
values ('00000000-0000-0000-0000-00000000p001', '00000000-0000-0000-0000-00000000000a', 'User A', 'Private to Circle A', '00000000-0000-0000-0000-0000000000ca');

insert into public.posts (id, author_id, author_name, body, circle_id)
values ('00000000-0000-0000-0000-00000000p002', '00000000-0000-0000-0000-00000000000a', 'User A', 'Public to everyone signed in', null);

insert into public.post_comments (id, post_id, user_id, author_name, body)
values ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000p001', '00000000-0000-0000-0000-00000000000a', 'User A', 'A comment on my own private post');

insert into public.post_likes (post_id, user_id)
values ('00000000-0000-0000-0000-00000000p001', '00000000-0000-0000-0000-00000000000a');

insert into public.reels (id, author_id, author_name, author_role, condition, title, caption, circle_id)
values ('00000000-0000-0000-0000-00000000r001', '00000000-0000-0000-0000-00000000000a', 'User A', 'Caregiver', 'Test', 'Private reel', 'Private to Circle A', '00000000-0000-0000-0000-0000000000ca');

select pg_temp.act_as_owner();

-- ------------------------------------------------------------- assertions
do $$
declare n int;
begin
  -- A (member of Circle A) sees both the private and the public post.
  perform pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
  select count(*) into n from public.posts where id = '00000000-0000-0000-0000-00000000p001';
  if n <> 1 then raise exception 'FAIL: Circle A member cannot read their own circle''s post'; end if;
  select count(*) into n from public.posts where id = '00000000-0000-0000-0000-00000000p002';
  if n <> 1 then raise exception 'FAIL: author cannot read their own public post'; end if;

  -- B (member of a different circle) sees the public post, never the private one.
  perform pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
  select count(*) into n from public.posts where id = '00000000-0000-0000-0000-00000000p001';
  if n <> 0 then raise exception 'FAIL: User B (Circle B) can read a Circle A private post'; end if;
  select count(*) into n from public.posts where id = '00000000-0000-0000-0000-00000000p002';
  if n <> 1 then raise exception 'FAIL: User B cannot read a public post'; end if;

  -- C (no circle at all) is the strictest case: same result as B for the
  -- private post, and still gets the public one.
  perform pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
  select count(*) into n from public.posts where id = '00000000-0000-0000-0000-00000000p001';
  if n <> 0 then raise exception 'FAIL: User C (no circle) can read a Circle A private post'; end if;
  select count(*) into n from public.posts where id = '00000000-0000-0000-0000-00000000p002';
  if n <> 1 then raise exception 'FAIL: User C cannot read a public post'; end if;

  -- Comments and likes inherit the parent post's privacy, for both outsiders.
  select count(*) into n from public.post_comments where post_id = '00000000-0000-0000-0000-00000000p001';
  if n <> 0 then raise exception 'FAIL: User C can read a comment on a Circle A private post'; end if;
  select count(*) into n from public.post_likes where post_id = '00000000-0000-0000-0000-00000000p001';
  if n <> 0 then raise exception 'FAIL: User C can read a like on a Circle A private post'; end if;

  perform pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
  select count(*) into n from public.post_comments where post_id = '00000000-0000-0000-0000-00000000p001';
  if n <> 0 then raise exception 'FAIL: User B can read a comment on a Circle A private post'; end if;

  -- Reels follow the identical pattern -- check it independently, not by
  -- assumption, since it is a separate table and a separate policy.
  select count(*) into n from public.reels where id = '00000000-0000-0000-0000-00000000r001';
  if n <> 0 then raise exception 'FAIL: User B can read a Circle A private reel'; end if;

  raise notice 'read checks: ALL PASSED';
end $$;

-- B cannot comment on or like a post in a circle B does not belong to --
-- "cannot read" and "cannot write" are two different policies and both must
-- hold, or someone could still interact blind.
do $$
begin
  perform pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
  begin
    insert into public.post_comments (post_id, user_id, author_name, body)
    values ('00000000-0000-0000-0000-00000000p001', '00000000-0000-0000-0000-00000000000b', 'User B', 'I should not be able to say this');
    raise exception 'FAIL: User B inserted a comment on a post they cannot read';
  exception when insufficient_privilege or others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    -- Expected: row-level security rejected the insert.
  end;

  begin
    insert into public.post_likes (post_id, user_id) values ('00000000-0000-0000-0000-00000000p001', '00000000-0000-0000-0000-00000000000b');
    raise exception 'FAIL: User B liked a post they cannot read';
  exception when insufficient_privilege or others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  -- Nor can B post *as themselves* into Circle A, which they do not belong to.
  begin
    insert into public.posts (author_id, author_name, body, circle_id)
    values ('00000000-0000-0000-0000-00000000000b', 'User B', 'Letting myself into Circle A', '00000000-0000-0000-0000-0000000000ca');
    raise exception 'FAIL: User B posted into a circle they are not a member of';
  exception when insufficient_privilege or others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  raise notice 'write checks: ALL PASSED';
end $$;

-- A steward may remove a post inside the circle they steward (moderation);
-- a non-steward, non-author may not, even with the post's id in hand.
do $$
declare n int;
begin
  perform pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
  delete from public.posts where id = '00000000-0000-0000-0000-00000000p001';
  select count(*) into n from public.posts where id = '00000000-0000-0000-0000-00000000p001';
  if n <> 1 then raise exception 'FAIL: a non-steward, non-author deleted another circle''s post'; end if;

  perform pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); -- steward of Circle A
  delete from public.posts where id = '00000000-0000-0000-0000-00000000p001';
  select count(*) into n from public.posts where id = '00000000-0000-0000-0000-00000000p001';
  if n <> 0 then raise exception 'FAIL: the circle''s own steward could not moderate a post in it'; end if;

  raise notice 'moderation checks: ALL PASSED';
end $$;

select pg_temp.act_as_owner();

do $$ begin raise notice 'ALL CHECKS PASSED'; end $$;

rollback;
