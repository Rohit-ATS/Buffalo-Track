-- supabase/tests/matching_consent.sql
--
-- Proves two things from 20261004000022_matching_consent_enforcement.sql:
-- a suggestion pointing at someone who has not opted in is never readable,
-- and opting out expires every suggestion that already points at you --
-- immediately, not whenever it happens to lapse on its own.
--
-- Same caveats as supabase/tests/social_feed_privacy.sql: written but not
-- run against a live project from this session. Run it yourself:
--
--   supabase start
--   psql postgresql://postgres:postgres@localhost:54322/postgres \
--     -v ON_ERROR_STOP=1 -f supabase/tests/matching_consent.sql
--
-- Requires 20261003000013_family_suggestions_and_blocks.sql to have been
-- applied (it creates public.family_suggestions).

begin;

insert into auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, aud, role)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000d00a', 'viewer@test.local', 'x', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000d00b', 'target@test.local', 'x', now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, matching_opt_in)
values
  ('00000000-0000-0000-0000-00000000d00a', 'Viewer', true),
  ('00000000-0000-0000-0000-00000000d00b', 'Target', true) -- opted IN to start
on conflict (id) do update set matching_opt_in = excluded.matching_opt_in;

insert into public.family_suggestions (id, profile_id, kind, title, detail, reason, evidence_summary, target_profile_id, status)
values ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000d00a', 'person', 'Target', 'A nearby family', 'shared condition', 'matched on condition', '00000000-0000-0000-0000-00000000d00b', 'active')
on conflict (id) do update set status = 'active', target_profile_id = excluded.target_profile_id;

create or replace function pg_temp.act_as(p_user uuid) returns void as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$ language plpgsql;

do $$
declare n int;
begin
  -- Opted in: the suggestion is visible to the viewer it was written for.
  perform pg_temp.act_as('00000000-0000-0000-0000-00000000d00a');
  select count(*) into n from public.family_suggestions where id = '00000000-0000-0000-0000-00000000d001';
  if n <> 1 then raise exception 'FAIL: an opted-in person''s suggestion is not visible to the viewer it was written for'; end if;
end $$;

-- Target opts out. This must take effect immediately, not on the
-- suggestion's own schedule.
reset role;
update public.profiles set matching_opt_in = false where id = '00000000-0000-0000-0000-00000000d00b';

do $$
declare n int; s text;
begin
  perform pg_temp.act_as('00000000-0000-0000-0000-00000000d00a');
  select count(*) into n from public.family_suggestions where id = '00000000-0000-0000-0000-00000000d001';
  if n <> 0 then raise exception 'FAIL: a suggestion for someone who opted out is still readable'; end if;

  reset role;
  select status into s from public.family_suggestions where id = '00000000-0000-0000-0000-00000000d001';
  if s <> 'expired' then raise exception 'FAIL: opting out did not expire the stored suggestion row (status = %)', s; end if;

  raise notice 'ALL CHECKS PASSED';
end $$;

rollback;
