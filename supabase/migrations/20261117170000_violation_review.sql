-- Violation review: the case table, the guarded case functions and the additive notice data
-- (admin-violations-feedback, design D2, D3; tasks 1.1 to 1.4).
--
-- Nothing in the app reads any of this yet. Push it before the app: an old app against this database keeps
-- working, because the answers of block, ban and the two admin deletes only gain keys.
--
-- violation_cases is closed like admins and moderation_log (RLS on, no policy, no grant for anon and
-- authenticated, ADR 0005): only the definer functions below touch it. The partial unique index on open cases
-- is the "one open case per user" rule, so two tabs adding the same user are settled by the database.
--
-- New admin functions (security definer, empty search_path, assert_admin() first, executable by authenticated
-- only): admin_add_violation_case, admin_add_violation_case_for_author, admin_list_violation_cases,
-- admin_set_case_ground, admin_remove_violation_case, admin_start_warning, admin_mark_warned, admin_log_notice.
-- Their shared body, add_violation_case_of, is deliberately not named admin_*: admin_functions.test.sql requires
-- assert_admin() in every admin_% function, and this body is revoked from every client role and guarded by its
-- two callers (the same split ADR 0015 made for delete_poem_of).
--
-- Changed additively with `create or replace` (same signature and grants): apply_restriction closes the user's
-- open case in the same transaction and still returns void; admin_block_user and admin_ban_user read the open
-- case's ground under the per-user lock they already take; admin_block_user, admin_ban_user, admin_delete_poem
-- and admin_delete_collection add `notice_email` (always present, null when the account has no address) and
-- `ground` (the open case's ground at that moment, or null) to the jsonb they return, and the two deletes also add
-- `user_id` (the author's auth user id; their `author_id` is a profile id). delete_poem_of returns the poem's
-- `title` too (the owner's delete ignores the extra key). Every old key is unchanged.
--
-- The log (moderation_log) gets these action names: add-violation-case, set-case-ground, warn-violation-case,
-- remove-violation-case (target_kind `case`, target_id the case id) and notice-sent, notice-failed. A notice row
-- keeps the kind of the action it was about (block, ban, delete-poem, delete-collection) in target_kind, with the
-- user id as target_id: the log has no spare column, and a reader of the dashboard sees which action the email
-- belonged to without matching timestamps. No address and no message text is ever written to the log.
--
-- Down migration (documented, never auto-run; revert the app first; cases are lost, the restriction and log
-- tables are untouched):
--   drop function if exists public.admin_log_notice(uuid, text, text);
--   drop function if exists public.admin_mark_warned(uuid);
--   drop function if exists public.admin_start_warning(uuid);
--   drop function if exists public.admin_remove_violation_case(uuid);
--   drop function if exists public.admin_set_case_ground(uuid, text);
--   drop function if exists public.admin_list_violation_cases();
--   drop function if exists public.admin_add_violation_case_for_author(uuid, text, text, uuid);
--   drop function if exists public.admin_add_violation_case(uuid, text, text, uuid);
--   drop function if exists public.add_violation_case_of(uuid, text, text, uuid);
--   then re-run, as `create or replace`, the previous bodies from 20261113180000_admin_moderation_functions.sql:
--   apply_restriction, delete_poem_of, admin_block_user, admin_ban_user, admin_delete_poem and
--   admin_delete_collection; then `drop table if exists public.violation_cases;`.

-- ---------- The case table (task 1.1) ----------

create table public.violation_cases (
  id           uuid primary key default gen_random_uuid(),
  -- The case goes with the account. The log keeps its own copy of the ids, with no foreign key.
  user_id      uuid not null references auth.users (id) on delete cascade,
  ground       text not null check (ground in ('harmful-content', 'malicious-activity')),
  -- The poem or collection that prompted the case. No foreign key: the content can be deleted while the case
  -- stays, and the list then shows no title for it.
  content_kind text check (content_kind in ('poem', 'collection')),
  content_id   uuid,
  -- The admin's user id, a plain uuid: deleting an admin's account must not be blocked by, or erase, their cases.
  added_by     uuid not null,
  created_at   timestamptz not null default now(),
  warned_at    timestamptz,
  closed_at    timestamptz,
  closed_as    text check (closed_as in ('removed', 'blocked', 'banned')),
  constraint violation_cases_content_both_or_neither check ((content_kind is null) = (content_id is null)),
  constraint violation_cases_closed_together check ((closed_at is null) = (closed_as is null))
);

create unique index violation_cases_one_open_per_user on public.violation_cases (user_id) where closed_at is null;

alter table public.violation_cases enable row level security;
revoke all on public.violation_cases from anon, authenticated;

-- ---------- Adding a case (task 1.2) ----------

-- The shared body of both add functions. Takes the same per-user lock as block and ban (auth.users row), so a
-- block or ban and an add of one user run one after the other. Checks in this order: invalid arguments (22023),
-- an admin (`target-is-admin`, the caller included), an unknown user (`not-found`), an already blocked or banned
-- user (`already-restricted`), a user who already has an open case (`already-in-list`), recorded content that is
-- not that user's or no longer exists (`content-not-found`). A call that changes nothing writes no log row.
create function public.add_violation_case_of(
  target_user uuid,
  case_ground text,
  case_content_kind text,
  case_content_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_case uuid;
  content_found boolean;
begin
  if add_violation_case_of.target_user is null
    or add_violation_case_of.case_ground is null
    or add_violation_case_of.case_ground not in ('harmful-content', 'malicious-activity')
    or (add_violation_case_of.case_content_kind is null) <> (add_violation_case_of.case_content_id is null)
    or (add_violation_case_of.case_content_kind is not null
      and add_violation_case_of.case_content_kind not in ('poem', 'collection'))
  then
    raise exception 'invalid violation case' using errcode = '22023';
  end if;

  if add_violation_case_of.target_user = (select auth.uid())
    or exists (select 1 from public.admins a where a.user_id = add_violation_case_of.target_user) then
    return jsonb_build_object('status', 'target-is-admin');
  end if;

  perform 1 from auth.users u where u.id = add_violation_case_of.target_user for update;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  if exists (select 1 from public.account_restrictions r where r.user_id = add_violation_case_of.target_user) then
    return jsonb_build_object('status', 'already-restricted');
  end if;

  if exists (
    select 1 from public.violation_cases vc
    where vc.user_id = add_violation_case_of.target_user and vc.closed_at is null
  ) then
    return jsonb_build_object('status', 'already-in-list');
  end if;

  if add_violation_case_of.case_content_kind = 'poem' then
    select exists (
      select 1
      from public.poems p
      join public.author_profiles ap on ap.id = p.author_id
      where p.id = add_violation_case_of.case_content_id
        and ap.user_id = add_violation_case_of.target_user
    ) into content_found;
  elsif add_violation_case_of.case_content_kind = 'collection' then
    select exists (
      select 1
      from public.collections c
      join public.author_profiles ap on ap.id = c.author_id
      where c.id = add_violation_case_of.case_content_id
        and ap.user_id = add_violation_case_of.target_user
    ) into content_found;
  else
    content_found := true;
  end if;

  if not content_found then
    return jsonb_build_object('status', 'content-not-found');
  end if;

  -- The lock above makes a conflict unreachable; the unique index stays the rule, so a lost race could never
  -- raise an unreadable error.
  insert into public.violation_cases (user_id, ground, content_kind, content_id, added_by)
  values (
    add_violation_case_of.target_user,
    add_violation_case_of.case_ground,
    add_violation_case_of.case_content_kind,
    add_violation_case_of.case_content_id,
    (select auth.uid())
  )
  on conflict (user_id) where closed_at is null do nothing
  returning id into new_case;

  if new_case is null then
    return jsonb_build_object('status', 'already-in-list');
  end if;

  perform public.log_moderation('add-violation-case', add_violation_case_of.target_user, 'case', new_case);

  return jsonb_build_object('status', 'added');
end;
$$;

create function public.admin_add_violation_case(
  target_user_id uuid,
  ground text,
  content_kind text,
  content_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  return public.add_violation_case_of(
    admin_add_violation_case.target_user_id,
    admin_add_violation_case.ground,
    admin_add_violation_case.content_kind,
    admin_add_violation_case.content_id
  );
end;
$$;

-- The public pages know a profile id, not an auth user id.
create function public.admin_add_violation_case_for_author(
  author_profile_id uuid,
  ground text,
  content_kind text,
  content_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_user uuid;
begin
  perform public.assert_admin();

  select ap.user_id into target_user
  from public.author_profiles ap
  where ap.id = admin_add_violation_case_for_author.author_profile_id;

  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  return public.add_violation_case_of(
    target_user,
    admin_add_violation_case_for_author.ground,
    admin_add_violation_case_for_author.content_kind,
    admin_add_violation_case_for_author.content_id
  );
end;
$$;

-- ---------- Reading and changing a case (task 1.3) ----------

-- Open cases, newest first. Returns one row more than the 100 it is meant to show, so the page can tell "more
-- exist" from "exactly 100"; the app shows the first 100. The content title is null once the poem or collection
-- is deleted (the content id has no foreign key). `#variable_conflict use_column` because the output columns
-- share names with table columns.
create function public.admin_list_violation_cases()
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  author_name text,
  author_profile_id uuid,
  ground text,
  content_kind text,
  content_id uuid,
  content_title text,
  created_at timestamptz,
  warned_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  shown_limit constant integer := 100;
begin
  perform public.assert_admin();

  return query
  select
    vc.id,
    vc.user_id,
    coalesce(u.email, '')::text,
    nullif(btrim(concat_ws(' ', ap.first_name, ap.last_name)), ''),
    ap.id,
    vc.ground,
    vc.content_kind,
    vc.content_id,
    case vc.content_kind
      when 'poem' then (select p.title from public.poems p where p.id = vc.content_id)
      when 'collection' then (select c.title from public.collections c where c.id = vc.content_id)
    end,
    vc.created_at,
    vc.warned_at
  from public.violation_cases vc
  join auth.users u on u.id = vc.user_id
  left join public.author_profiles ap on ap.user_id = vc.user_id
  where vc.closed_at is null
  order by vc.created_at desc, vc.id desc
  limit shown_limit + 1;
end;
$$;

-- Switches an open case between the two grounds. Only the ground changes: a warning already recorded stays, so
-- switching away and back never allows a second one. Switching to the ground it already has changes nothing and
-- writes no row. A closed or missing case answers `not-found`.
create function public.admin_set_case_ground(case_id uuid, ground text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  case_user uuid;
  current_ground text;
begin
  perform public.assert_admin();

  if admin_set_case_ground.ground is null
    or admin_set_case_ground.ground not in ('harmful-content', 'malicious-activity') then
    raise exception 'invalid violation ground' using errcode = '22023';
  end if;

  select vc.user_id, vc.ground into case_user, current_ground
  from public.violation_cases vc
  where vc.id = admin_set_case_ground.case_id and vc.closed_at is null
  for update;

  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  if current_ground <> admin_set_case_ground.ground then
    update public.violation_cases vc set ground = admin_set_case_ground.ground
    where vc.id = admin_set_case_ground.case_id;

    perform public.log_moderation('set-case-ground', case_user, 'case', admin_set_case_ground.case_id);
  end if;

  return jsonb_build_object('status', 'ground-changed');
end;
$$;

-- Ends an open case without restricting the user.
create function public.admin_remove_violation_case(case_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  case_user uuid;
begin
  perform public.assert_admin();

  update public.violation_cases vc set closed_at = now(), closed_as = 'removed'
  where vc.id = admin_remove_violation_case.case_id and vc.closed_at is null
  returning vc.user_id into case_user;

  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  perform public.log_moderation('remove-violation-case', case_user, 'case', admin_remove_violation_case.case_id);

  return jsonb_build_object('status', 'removed');
end;
$$;

-- The checks before a warning email, and the address to send it to. Writes nothing. Checks in this order:
-- missing or closed case (`not-found`), a case that is not `harmful-content` (`wrong-ground`), a case already
-- warned (`already-warned`), a user who is blocked or banned (`already-restricted`), an account with no address
-- (`no-address`).
create function public.admin_start_warning(case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  case_user uuid;
  case_ground text;
  case_warned_at timestamptz;
  address text;
begin
  perform public.assert_admin();

  select vc.user_id, vc.ground, vc.warned_at into case_user, case_ground, case_warned_at
  from public.violation_cases vc
  where vc.id = admin_start_warning.case_id and vc.closed_at is null;

  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  if case_ground <> 'harmful-content' then
    return jsonb_build_object('status', 'wrong-ground');
  end if;

  if case_warned_at is not null then
    return jsonb_build_object('status', 'already-warned');
  end if;

  if exists (select 1 from public.account_restrictions r where r.user_id = case_user) then
    return jsonb_build_object('status', 'already-restricted');
  end if;

  select nullif(btrim(u.email), '') into address from auth.users u where u.id = case_user;

  if address is null then
    return jsonb_build_object('status', 'no-address');
  end if;

  return jsonb_build_object('status', 'ready', 'email', address);
end;
$$;

-- Records the warning as sent, once, after the email service accepted it. Requires an open case, so a block in
-- another tab between the two steps leaves no stray warned_at (`not-found`); a case already warned is left
-- untouched and says so, so a retry never restarts the deadline.
create function public.admin_mark_warned(case_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  case_user uuid;
  case_warned_at timestamptz;
begin
  perform public.assert_admin();

  select vc.user_id, vc.warned_at into case_user, case_warned_at
  from public.violation_cases vc
  where vc.id = admin_mark_warned.case_id and vc.closed_at is null
  for update;

  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  if case_warned_at is not null then
    return jsonb_build_object('status', 'already-warned');
  end if;

  update public.violation_cases vc set warned_at = now() where vc.id = admin_mark_warned.case_id;

  perform public.log_moderation('warn-violation-case', case_user, 'case', admin_mark_warned.case_id);

  return jsonb_build_object('status', 'warned');
end;
$$;

-- ---------- Restriction closes the case, and the answers carry the notice data (task 1.4) ----------

-- From 20261113180000_admin_moderation_functions.sql, plus: the user's open case is closed in the same
-- transaction, recording how it ended. closed_as takes the restriction's kind (`blocked` or `banned`), the two
-- values the check on the column allows besides `removed`. Still returns void: a changed return type would make
-- `create or replace` fail and force a drop and a re-grant.
create or replace function public.apply_restriction(target_user uuid, restriction_kind text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ban_until constant timestamptz := now() + interval '100 years';
begin
  update auth.users u set banned_until = ban_until where u.id = target_user;
  delete from auth.sessions s where s.user_id = target_user;

  insert into public.account_restrictions as r (user_id, kind, created_by)
  values (target_user, restriction_kind, (select auth.uid()))
  on conflict (user_id) do update set
    kind = excluded.kind,
    created_at = now(),
    created_by = excluded.created_by
  where r.kind = 'blocked';

  update public.violation_cases vc set closed_at = now(), closed_as = restriction_kind
  where vc.user_id = target_user and vc.closed_at is null;
end;
$$;

-- From 20261113180000_admin_moderation_functions.sql, plus `notice_email` and `ground` in the answer. The
-- ground is read under the per-user lock and before apply_restriction closes the case.
create or replace function public.admin_block_user(target_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_email text;
  case_ground text;
begin
  perform public.assert_admin();

  if admin_block_user.target_user_id = (select auth.uid())
    or exists (select 1 from public.admins a where a.user_id = admin_block_user.target_user_id) then
    return jsonb_build_object('status', 'target-is-admin');
  end if;

  -- One lock per user, taken first and in the same place by block, ban, unblock and add: two moderation calls on
  -- one user run one after the other, and the second sees the first's restriction.
  select u.email into target_email from auth.users u where u.id = admin_block_user.target_user_id for update;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  if exists (select 1 from public.account_restrictions r where r.user_id = admin_block_user.target_user_id) then
    return jsonb_build_object('status', 'already-restricted');
  end if;

  select vc.ground into case_ground
  from public.violation_cases vc
  where vc.user_id = admin_block_user.target_user_id and vc.closed_at is null;

  perform public.apply_restriction(admin_block_user.target_user_id, 'blocked');
  perform public.log_moderation('block', admin_block_user.target_user_id, 'user', admin_block_user.target_user_id);

  return jsonb_build_object(
    'status', 'blocked',
    'notice_email', nullif(btrim(target_email), ''),
    'ground', case_ground
  );
end;
$$;

-- From 20261113180000_admin_moderation_functions.sql, plus `notice_email` and `ground` in the answer.
create or replace function public.admin_ban_user(target_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_email text;
  case_ground text;
begin
  perform public.assert_admin();

  if admin_ban_user.target_user_id = (select auth.uid())
    or exists (select 1 from public.admins a where a.user_id = admin_ban_user.target_user_id) then
    return jsonb_build_object('status', 'target-is-admin');
  end if;

  -- The per-user lock, as in admin_block_user.
  select u.email into target_email from auth.users u where u.id = admin_ban_user.target_user_id for update;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  if exists (
    select 1 from public.account_restrictions r
    where r.user_id = admin_ban_user.target_user_id and r.kind = 'banned'
  ) then
    return jsonb_build_object('status', 'already-restricted');
  end if;

  select vc.ground into case_ground
  from public.violation_cases vc
  where vc.user_id = admin_ban_user.target_user_id and vc.closed_at is null;

  perform public.apply_restriction(admin_ban_user.target_user_id, 'banned');

  if nullif(btrim(target_email), '') is not null then
    insert into public.banned_emails (email_hash)
    values (public.banned_email_hash(target_email))
    on conflict (email_hash) do nothing;
  end if;

  perform public.log_moderation('ban', admin_ban_user.target_user_id, 'user', admin_ban_user.target_user_id);

  return jsonb_build_object(
    'status', 'banned',
    'notice_email', nullif(btrim(target_email), ''),
    'ground', case_ground
  );
end;
$$;

-- From 20261113180000_admin_moderation_functions.sql, plus `title` in the answer: the admin's notice names the
-- poem, and the title must come from the database, never from the browser. The owner's delete_my_poem returns
-- this answer too and ignores the extra key.
create or replace function public.delete_poem_of(profile uuid, poem_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  deleted_author uuid;
  deleted_path text;
  deleted_title text;
begin
  delete from public.poems p
  where p.id = delete_poem_of.poem_id
    and p.author_id = delete_poem_of.profile
  returning p.author_id, p.illustration_path, p.title into deleted_author, deleted_path, deleted_title;

  if deleted_author is null then
    return jsonb_build_object('status', 'not-found');
  end if;

  return jsonb_build_object(
    'status', 'deleted',
    'author_id', deleted_author,
    'illustration_path', deleted_path,
    'title', deleted_title
  );
end;
$$;

-- From 20261113180000_admin_moderation_functions.sql, plus `user_id`, `notice_email` and `ground` in the
-- answer of a successful delete (the address and ground are read in the same transaction as the delete). The
-- case stays open: only a block or ban closes it.
create or replace function public.admin_delete_poem(poem_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  profile uuid;
  author_user uuid;
  author_email text;
  case_ground text;
  result jsonb;
begin
  perform public.assert_admin();

  select p.author_id into profile from public.poems p where p.id = admin_delete_poem.poem_id;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  select ap.user_id into author_user from public.author_profiles ap where ap.id = profile;

  -- The foreign key makes this unreachable; stated so that a null can never reach the log's not-null column and
  -- roll the delete back with an unreadable error.
  if author_user is null then
    raise exception 'the poem''s author profile has no account' using errcode = 'P0002';
  end if;

  result := public.delete_poem_of(profile, admin_delete_poem.poem_id);

  if result ->> 'status' = 'deleted' then
    perform public.log_moderation('delete-poem', author_user, 'poem', admin_delete_poem.poem_id);

    select u.email into author_email from auth.users u where u.id = author_user;
    select vc.ground into case_ground
    from public.violation_cases vc
    where vc.user_id = author_user and vc.closed_at is null;

    result := result || jsonb_build_object(
      'user_id', author_user,
      'notice_email', nullif(btrim(author_email), ''),
      'ground', case_ground
    );
  end if;

  return result;
end;
$$;

-- From 20261113180000_admin_moderation_functions.sql, plus `user_id`, `notice_email` and `ground` in the answer
-- of a successful delete, as in admin_delete_poem.
create or replace function public.admin_delete_collection(collection_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  profile uuid;
  author_user uuid;
  author_email text;
  case_ground text;
  result jsonb;
begin
  perform public.assert_admin();

  select c.author_id into profile from public.collections c where c.id = admin_delete_collection.collection_id;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  select ap.user_id into author_user from public.author_profiles ap where ap.id = profile;

  -- Same guard as admin_delete_poem: unreachable through the foreign key, stated for a clear error.
  if author_user is null then
    raise exception 'the collection''s author profile has no account' using errcode = 'P0002';
  end if;

  result := public.delete_collection_of(profile, admin_delete_collection.collection_id);

  if result ->> 'status' = 'deleted' then
    perform public.log_moderation(
      'delete-collection', author_user, 'collection', admin_delete_collection.collection_id
    );

    select u.email into author_email from auth.users u where u.id = author_user;
    select vc.ground into case_ground
    from public.violation_cases vc
    where vc.user_id = author_user and vc.closed_at is null;

    result := result || jsonb_build_object(
      'user_id', author_user,
      'notice_email', nullif(btrim(author_email), ''),
      'ground', case_ground
    );
  end if;

  return result;
end;
$$;

-- The outcome of a standard notice, written by a separate call after the restricting action committed. The
-- arguments are enumerated, so no address and no text can reach the log. The kind goes in target_kind and the
-- user id in target_id (see the header).
create function public.admin_log_notice(target_user_id uuid, notice_kind text, outcome text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  if admin_log_notice.target_user_id is null
    or admin_log_notice.notice_kind is null
    or admin_log_notice.notice_kind not in ('block', 'ban', 'delete-poem', 'delete-collection')
    or admin_log_notice.outcome is null
    or admin_log_notice.outcome not in ('sent', 'failed')
  then
    raise exception 'invalid notice log entry' using errcode = '22023';
  end if;

  perform public.log_moderation(
    'notice-' || admin_log_notice.outcome,
    admin_log_notice.target_user_id,
    admin_log_notice.notice_kind,
    admin_log_notice.target_user_id
  );
end;
$$;

-- ---------- Grants (NFR-2) ----------
-- Supabase's default privileges grant anon on create, so each revoke is stated. The shared body is executable by
-- no client role; the existing functions re-created above keep their grants.

revoke execute on function public.add_violation_case_of(uuid, text, text, uuid) from public, anon, authenticated;

revoke execute on function public.admin_add_violation_case(uuid, text, text, uuid) from public, anon;
revoke execute on function public.admin_add_violation_case_for_author(uuid, text, text, uuid) from public, anon;
revoke execute on function public.admin_list_violation_cases() from public, anon;
revoke execute on function public.admin_set_case_ground(uuid, text) from public, anon;
revoke execute on function public.admin_remove_violation_case(uuid) from public, anon;
revoke execute on function public.admin_start_warning(uuid) from public, anon;
revoke execute on function public.admin_mark_warned(uuid) from public, anon;
revoke execute on function public.admin_log_notice(uuid, text, text) from public, anon;
grant execute on function public.admin_add_violation_case(uuid, text, text, uuid) to authenticated;
grant execute on function public.admin_add_violation_case_for_author(uuid, text, text, uuid) to authenticated;
grant execute on function public.admin_list_violation_cases() to authenticated;
grant execute on function public.admin_set_case_ground(uuid, text) to authenticated;
grant execute on function public.admin_remove_violation_case(uuid) to authenticated;
grant execute on function public.admin_start_warning(uuid) to authenticated;
grant execute on function public.admin_mark_warned(uuid) to authenticated;
grant execute on function public.admin_log_notice(uuid, text, text) to authenticated;
