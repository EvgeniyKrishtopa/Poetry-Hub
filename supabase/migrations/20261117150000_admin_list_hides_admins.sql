-- Admin moderation, part 3: the user list leaves out admins (admin-moderation, design D15, FR-3).
--
-- An admin row only ever showed a badge and no control, so the list is the moderated accounts only.
-- admin_list_users now skips every user present in public.admins (the caller included) in the same where clause
-- as the keyset predicate, before the limit: pages stay full and the cursor, which is always a shown row, still
-- works on (created_at, id). The result no longer has an is_admin column, since no row is an admin. A changed
-- result type cannot be made with `create or replace`, so the function is dropped and re-created with the same
-- signature, attributes and grants as in 20261113180000_admin_moderation_functions.sql (security definer, empty
-- search_path, assert_admin() first, execute for authenticated only; Supabase's default privileges grant anon on
-- create, so the revoke is repeated).
--
-- FR-7 is unchanged: admin_block_user, admin_ban_user and admin_revoke_sessions still answer `target-is-admin`
-- for an admin's id, so a direct call that names one is still refused; the list just no longer offers one.
--
-- Deploy order (design D15): on a project already running the old app, deploy the app first and push this
-- migration after it. The old app's row schema requires is_admin, so it shows the list as unavailable against this
-- function; the new app also works against the old function.
--
-- Down migration (documented, never auto-run; revert the app first): `drop function if exists
-- public.admin_list_users(integer, timestamptz, uuid, text);`, then re-run the `create function
-- public.admin_list_users` statement and its revoke and grant lines from
-- 20261113180000_admin_moderation_functions.sql (the body with the `is_admin` output column and the
-- `exists (select 1 from public.admins ...)` select item).

drop function public.admin_list_users(integer, timestamptz, uuid, text);

-- Users who are not admins, newest first, keyset-paged by (created_at, id), with an exact-email filter: the whole
-- address, trimmed and lower-cased on both sides. Only the columns the page shows. The app asks for one row more
-- than it shows to know whether a next page exists. `#variable_conflict use_column` because the output columns
-- share names with table columns; the address column is `user_email` because a function cannot have an argument
-- and an output column both called `email`, and the argument keeps the name the app passes. The argument is
-- always written admin_list_users.email.
create function public.admin_list_users(
  page_size integer,
  after_created_at timestamptz default null,
  after_id uuid default null,
  email text default null
)
returns table (
  id uuid,
  user_email text,
  author_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  restriction text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.assert_admin();

  -- The cursor is the pair: one half alone would compare to null and silently return an empty page.
  if (admin_list_users.after_created_at is null) <> (admin_list_users.after_id is null) then
    raise exception 'the cursor needs both after_created_at and after_id' using errcode = '22023';
  end if;

  return query
  select
    u.id,
    coalesce(u.email, '')::text,
    nullif(btrim(concat_ws(' ', ap.first_name, ap.last_name)), ''),
    u.created_at,
    u.last_sign_in_at,
    r.kind
  from auth.users u
  left join public.author_profiles ap on ap.user_id = u.id
  left join public.account_restrictions r on r.user_id = u.id
  where not exists (select 1 from public.admins a where a.user_id = u.id)
    and (admin_list_users.after_created_at is null
      or (u.created_at, u.id) < (admin_list_users.after_created_at, admin_list_users.after_id))
    and (nullif(btrim(admin_list_users.email), '') is null
      or lower(btrim(u.email)) = lower(btrim(admin_list_users.email)))
  order by u.created_at desc, u.id desc
  limit admin_list_users.page_size;
end;
$$;

revoke execute on function public.admin_list_users(integer, timestamptz, uuid, text) from public, anon;
grant execute on function public.admin_list_users(integer, timestamptz, uuid, text) to authenticated;
