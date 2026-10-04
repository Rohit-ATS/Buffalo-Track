-- Live family home data. This migration is intentionally not applied by the repository.
-- Run it only in the teammate-owned Supabase project after reviewing it.

do $$ begin
  create type public.family_suggestion_kind as enum ('person', 'circle', 'study', 'resource');
exception when duplicate_object then null; end $$;
create table if not exists public.family_suggestions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind public.family_suggestion_kind not null,
  title text not null,
  detail text not null,
  reason text not null,
  evidence_summary text not null,
  evidence_url text,
  source_url text,
  target_circle_id uuid references public.circles(id) on delete set null,
  target_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'dismissed', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint family_suggestion_target check (
    (kind = 'circle' and target_circle_id is not null) or kind <> 'circle'
  )
);
create table if not exists public.profile_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint profile_blocks_distinct check (blocker_id <> blocked_id)
);

alter table public.family_suggestions enable row level security;
alter table public.profile_blocks enable row level security;

-- New tables may require explicit API exposure/privileges in newer Supabase projects.
grant select, insert, update, delete on public.family_suggestions to authenticated;
grant select, insert, delete on public.profile_blocks to authenticated;

drop policy if exists "families read own active suggestions" on public.family_suggestions;
create policy "families read own active suggestions" on public.family_suggestions for select to authenticated
  using (profile_id = auth.uid() and status = 'active' and (expires_at is null or expires_at > now()));
drop policy if exists "families dismiss own suggestions" on public.family_suggestions;
create policy "families dismiss own suggestions" on public.family_suggestions for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and status in ('active', 'dismissed'));
drop policy if exists "users read own blocks" on public.profile_blocks;
create policy "users read own blocks" on public.profile_blocks for select to authenticated using (blocker_id = auth.uid());
drop policy if exists "users create own blocks" on public.profile_blocks;
create policy "users create own blocks" on public.profile_blocks for insert to authenticated with check (blocker_id = auth.uid());
drop policy if exists "users remove own blocks" on public.profile_blocks;
create policy "users remove own blocks" on public.profile_blocks for delete to authenticated using (blocker_id = auth.uid());

-- The existing migration uses SECURITY DEFINER helpers in public. Restrict invocation
-- to signed-in users so anonymous callers cannot execute privileged helpers.
revoke all on function public.is_circle_member(uuid) from public;
revoke all on function public.is_circle_steward(uuid) from public;
revoke all on function public.is_private_conversation_member(uuid) from public;
revoke all on function public.has_family_role(public.family_role) from public;
revoke all on function public.current_profile_role() from public;
grant execute on function public.is_circle_member(uuid), public.is_circle_steward(uuid), public.is_private_conversation_member(uuid), public.has_family_role(public.family_role), public.current_profile_role() to authenticated;
