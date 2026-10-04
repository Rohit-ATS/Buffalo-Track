-- 20261004000022_matching_consent_enforcement.sql
--
-- P0 item 3: matching consent must be enforced by the database, not only
-- promised by the UI. Depends on 20261003000013_family_suggestions_and_blocks.sql
-- having been applied (same dependency every later migration on these tables
-- already has).
--
-- `profiles.matching_opt_in` already defaults to `false` (20261003000012), and
-- the live search behind direct messages (20261004000020_direct_messages.sql,
-- public.search_people) already re-checks it on every call, so turning
-- matching off there takes effect on the very next query -- nothing cached.
--
-- `family_suggestions` is different: a suggestion is a row written once, at
-- generation time, and read many times after. If the person it points at
-- later opts out, the stored row does not know that on its own -- it keeps
-- showing someone who revoked consent until its own `expires_at` happens to
-- pass. That gap is what this migration closes: opting out immediately
-- expires every stored suggestion that points at you, not just future ones.

create or replace function public.expire_suggestions_on_matching_opt_out() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.matching_opt_in = false and (old.matching_opt_in is distinct from false) then
    update public.family_suggestions
    set status = 'expired'
    where target_profile_id = new.id
      and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists matching_opt_out_expires_suggestions on public.profiles;
create trigger matching_opt_out_expires_suggestions
after update of matching_opt_in on public.profiles
for each row execute function public.expire_suggestions_on_matching_opt_out();

-- Belt and braces: even if a future suggestion-generation path forgets to
-- check matching_opt_in before inserting, the read path the family's own
-- browser uses cannot return someone who is not (right now) opted in. The
-- existing "families read own active suggestions" policy (20261003000013)
-- already scopes rows to the signed-in viewer; this adds the target's live
-- consent as a second, independent condition on top of it, for the one kind
-- of suggestion that points at a specific person.
drop policy if exists "families read own active suggestions" on public.family_suggestions;
create policy "families read own active suggestions" on public.family_suggestions
  for select to authenticated
  using (
    profile_id = auth.uid()
    and status = 'active'
    and (expires_at is null or expires_at > now())
    and (
      kind <> 'person'
      or target_profile_id is null
      or exists (
        select 1 from public.profiles p
        where p.id = target_profile_id and p.matching_opt_in
      )
    )
  );
