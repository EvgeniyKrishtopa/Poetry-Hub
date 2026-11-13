-- Admin moderation, part 2: the admin functions, the internal delete functions, the storage policies for admins
-- and the sign-up hook (admin-moderation, design D2, D3, D6, D7, D10, D11).
--
-- Every admin_* function is `security definer` with an empty search_path, executable by `authenticated` only,
-- and starts with `perform public.assert_admin()` (42501 for a non-admin or a signed-out caller), so a direct
-- PostgREST call by anyone else fails inside the database whatever the UI shows (NFR-1). A call that changes
-- nothing answers with a status and writes no moderation_log row; a successful change writes exactly one, in the
-- same transaction (FR-11).
--
-- Internal functions (revoked from public, anon and authenticated, so no client can call them):
--   delete_poem_of(profile, poem_id) and delete_collection_of(profile, collection_id): the bodies of the owner's
--     deletes, moved here so the admin deletes do the same work for the row's own author (design D7). They take an
--     owner as an argument, which ADR 0005 D1 forbids for anything a client can call; the admin functions pass
--     the row's own author_id after assert_admin(), the owner functions pass my_author_profile_id().
--   apply_restriction(user, kind): the one place that sets the Auth ban, ends the sessions and records the
--     restriction; block and ban share it.
--   log_moderation(...): the one place that appends a moderation_log row.
--
-- The functions run as the migration role (postgres) and write to the auth schema (auth.users.banned_until,
-- auth.sessions). That couples us to Supabase's internal schema; it is confined to apply_restriction,
-- admin_unblock_user and admin_revoke_sessions, and task 2.8 proves it on the local stack and the hosted project.
--
-- banned_until is a finite far-future time (now() + 100 years), not `infinity`: GoTrue reads the column into a
-- Go time.Time, and `infinity` may fail to load and turn a refusal into a 500 (design D3, task 2.8).
--
-- The hook reject_banned_signup(event) is the Before User Created hook (design D6). It allows on any internal
-- error or unrecognised input, so a broken hook can weaken a ban but never blocks every sign-up. A banned address
-- gets HTTP 403 and the fixed message `signup not allowed`; signUpAction matches exactly that (task 4.5).
-- Registered for the local stack in supabase/config.toml; on the hosted project it is a dashboard step
-- (docs/environment.md, Deploy checklist).
--
-- The ban list stores sha256(lower(btrim(email))) as hex, computed with the built-in sha256(), so no extension
-- is needed and the hook looks the digest up by equality.
--
-- Down migration (documented, never auto-run; revert the app first):
--   drop policy if exists "admins delete poem illustrations" on storage.objects;
--   drop policy if exists "admins read poem illustrations" on storage.objects;
--   drop function if exists public.reject_banned_signup(jsonb);
--   drop function if exists public.may_moderate_author(uuid);
--   drop function if exists public.admin_delete_collection(uuid);
--   drop function if exists public.admin_delete_poem(uuid);
--   drop function if exists public.admin_revoke_sessions(uuid);
--   drop function if exists public.admin_ban_user(uuid);
--   drop function if exists public.admin_unblock_user(uuid);
--   drop function if exists public.admin_block_user(uuid);
--   drop function if exists public.admin_list_users(integer, timestamptz, uuid, text);
--   drop function if exists public.log_moderation(text, uuid, text, uuid);
--   drop function if exists public.apply_restriction(uuid, text);
--   drop function if exists public.banned_email_hash(text);
--   then re-run, as `create or replace`, the bodies of delete_my_poem and delete_my_collection from
--   20261113170000_admin_moderation.sql with the deletes inline (as they were before this migration), and drop
--   public.delete_collection_of(uuid, uuid) and public.delete_poem_of(uuid, uuid). Remove the
--   [auth.hook.before_user_created] block from supabase/config.toml and the hook in the dashboard.

-- ---------- Internal helpers ----------

-- The one home of the ban-list digest: sha256 of the trimmed, lower-cased address, as hex. admin_ban_user stores
-- it and reject_banned_signup looks it up, so they must never compute it separately.
create function public.banned_email_hash(address text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(lower(btrim(banned_email_hash.address)), 'UTF8')), 'hex');
$$;

-- Sets the Auth ban (finite far-future time), ends every session and records the restriction. A blocked account
-- that is banned later has its row replaced; a banned row is never replaced, so a block that loses a race to a
-- ban cannot undo it (FR-4). The callers have already checked admin, target and state, and hold the user's
-- auth.users row lock.
create function public.apply_restriction(target_user uuid, restriction_kind text)
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
end;
$$;

-- One audit row for the calling admin. No text of deleted content is ever passed in.
create function public.log_moderation(log_action text, log_user uuid, log_kind text, log_target uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.moderation_log (admin_id, action, target_user_id, target_kind, target_id)
  values ((select auth.uid()), log_action, log_user, log_kind, log_target);
$$;

-- ---------- The delete bodies, moved out of the owner's functions (task 2.1, design D7) ----------

-- From 20261113170000_admin_moderation.sql (delete_my_poem): the row is deleted, the creation-log row is kept and
-- nothing is renumbered (ADR 0014 D3). A null profile matches no row, so it answers not-found.
create function public.delete_poem_of(profile uuid, poem_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  deleted_author uuid;
  deleted_path text;
begin
  delete from public.poems p
  where p.id = delete_poem_of.poem_id
    and p.author_id = delete_poem_of.profile
  returning p.author_id, p.illustration_path into deleted_author, deleted_path;

  if deleted_author is null then
    return jsonb_build_object('status', 'not-found');
  end if;

  return jsonb_build_object(
    'status', 'deleted',
    'author_id', deleted_author,
    'illustration_path', deleted_path
  );
end;
$$;

-- From 20261113170000_admin_moderation.sql (delete_my_collection): takes the advisory lock of the profile it is
-- given (ADR 0014 D5), places the collection's poems first among that author's free poems, then deletes it.
create function public.delete_collection_of(profile uuid, collection_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  free_first integer;
  freed_count integer;
  deleted_title text;
  deleted_author uuid;
begin
  if delete_collection_of.profile is not null then
    perform pg_advisory_xact_lock(hashtextextended(delete_collection_of.profile::text, 0));

    -- The collection first, then its poems, the order every writer takes.
    perform 1 from public.collections c
    where c.id = delete_collection_of.collection_id and c.author_id = delete_collection_of.profile
    for update;

    if found then
      select coalesce(min(p.position), 0) into free_first from public.poems p
      where p.author_id = delete_collection_of.profile
        and p.collection_id is null;

      select count(*) into freed_count from public.poems p
      where p.author_id = delete_collection_of.profile
        and p.collection_id = delete_collection_of.collection_id;

      update public.poems p set position = free_first - freed_count + f.rn
      from (
        select q.id, row_number() over (order by q.position, q.id) - 1 as rn
        from public.poems q
        where q.author_id = delete_collection_of.profile
          and q.collection_id = delete_collection_of.collection_id
      ) f
      where p.id = f.id;
    end if;
  end if;

  delete from public.collections c
  where c.id = delete_collection_of.collection_id
    and c.author_id = delete_collection_of.profile
  returning c.title, c.author_id into deleted_title, deleted_author;

  if deleted_title is null then
    return jsonb_build_object('status', 'not-found');
  end if;

  return jsonb_build_object('status', 'deleted', 'title', deleted_title, 'author_id', deleted_author);
end;
$$;

-- The owner's deletes keep their signatures, answers, and the restriction check as their first statement.
create or replace function public.delete_my_poem(poem_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.assert_not_restricted();

  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  return public.delete_poem_of(public.my_author_profile_id(), delete_my_poem.poem_id);
end;
$$;

create or replace function public.delete_my_collection(collection_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.assert_not_restricted();

  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  return public.delete_collection_of(public.my_author_profile_id(), delete_my_collection.collection_id);
end;
$$;

-- ---------- The admin functions ----------

-- Users newest first, keyset-paged by (created_at, id), with an exact-email filter: the whole address, trimmed
-- and lower-cased on both sides. Only the columns the page shows, plus the admin flag. The app asks for one row
-- more than it shows to know whether a next page exists. `#variable_conflict use_column` because the output
-- columns share names with table columns; the address column is `user_email` because a function cannot have an
-- argument and an output column both called `email`, and the argument keeps the name the app passes. The
-- argument is always written admin_list_users.email.
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
  restriction text,
  is_admin boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.assert_admin();

  return query
  select
    u.id,
    coalesce(u.email, '')::text,
    nullif(btrim(concat_ws(' ', ap.first_name, ap.last_name)), ''),
    u.created_at,
    u.last_sign_in_at,
    r.kind,
    exists (select 1 from public.admins a where a.user_id = u.id)
  from auth.users u
  left join public.author_profiles ap on ap.user_id = u.id
  left join public.account_restrictions r on r.user_id = u.id
  where (admin_list_users.after_created_at is null
      or (u.created_at, u.id) < (admin_list_users.after_created_at, admin_list_users.after_id))
    and (nullif(btrim(admin_list_users.email), '') is null
      or lower(btrim(u.email)) = lower(btrim(admin_list_users.email)))
  order by u.created_at desc, u.id desc
  limit admin_list_users.page_size;
end;
$$;

-- Block: restricted as `blocked`, Auth refuses sign-in and refresh, all sessions end (FR-4). Refuses the caller
-- and any admin (FR-7).
create function public.admin_block_user(target_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  if admin_block_user.target_user_id = (select auth.uid())
    or exists (select 1 from public.admins a where a.user_id = admin_block_user.target_user_id) then
    return jsonb_build_object('status', 'target-is-admin');
  end if;

  -- One lock per user, taken first and in the same place by block, ban and unblock: two moderation calls on one
  -- user run one after the other, and the second sees the first's restriction.
  perform 1 from auth.users u where u.id = admin_block_user.target_user_id for update;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  if exists (select 1 from public.account_restrictions r where r.user_id = admin_block_user.target_user_id) then
    return jsonb_build_object('status', 'already-restricted');
  end if;

  perform public.apply_restriction(admin_block_user.target_user_id, 'blocked');
  perform public.log_moderation('block', admin_block_user.target_user_id, 'user', admin_block_user.target_user_id);

  return jsonb_build_object('status', 'blocked');
end;
$$;

-- Unblock: only a `blocked` account; a banned one is never unblocked in the app, and a user without a
-- restriction (or an unknown id) answers `not-blocked` (FR-4).
create function public.admin_unblock_user(target_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  -- The same per-user lock as block and ban, so the lock order is one everywhere.
  perform 1 from auth.users u where u.id = admin_unblock_user.target_user_id for update;

  delete from public.account_restrictions r
  where r.user_id = admin_unblock_user.target_user_id
    and r.kind = 'blocked';

  if not found then
    return jsonb_build_object('status', 'not-blocked');
  end if;

  update auth.users u set banned_until = null where u.id = admin_unblock_user.target_user_id;
  perform public.log_moderation('unblock', admin_unblock_user.target_user_id, 'user', admin_unblock_user.target_user_id);

  return jsonb_build_object('status', 'unblocked');
end;
$$;

-- Ban: like block, with kind `banned` (replacing a `blocked` row), and the address joins the ban list as a hash
-- (FR-5). An account without an email adds no hash.
create function public.admin_ban_user(target_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_email text;
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

  perform public.apply_restriction(admin_ban_user.target_user_id, 'banned');

  if nullif(btrim(target_email), '') is not null then
    insert into public.banned_emails (email_hash)
    values (public.banned_email_hash(target_email))
    on conflict (email_hash) do nothing;
  end if;

  perform public.log_moderation('ban', admin_ban_user.target_user_id, 'user', admin_ban_user.target_user_id);

  return jsonb_build_object('status', 'banned');
end;
$$;

-- Revoke: ends every session and changes nothing else; the user can sign in again (FR-6). Deleting the sessions
-- cascades to their refresh tokens.
create function public.admin_revoke_sessions(target_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ended integer;
begin
  perform public.assert_admin();

  if admin_revoke_sessions.target_user_id = (select auth.uid())
    or exists (select 1 from public.admins a where a.user_id = admin_revoke_sessions.target_user_id) then
    return jsonb_build_object('status', 'target-is-admin');
  end if;

  if not exists (select 1 from auth.users u where u.id = admin_revoke_sessions.target_user_id) then
    return jsonb_build_object('status', 'not-found');
  end if;

  delete from auth.sessions s where s.user_id = admin_revoke_sessions.target_user_id;
  get diagnostics ended = row_count;

  if ended = 0 then
    return jsonb_build_object('status', 'no-sessions');
  end if;

  perform public.log_moderation(
    'revoke-sessions', admin_revoke_sessions.target_user_id, 'user', admin_revoke_sessions.target_user_id
  );

  return jsonb_build_object('status', 'revoked');
end;
$$;

-- Delete any poem: the owner's delete for the row's own author (design D7). The log row names the author's
-- auth user id; it never holds the poem's text (FR-8, FR-11).
create function public.admin_delete_poem(poem_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  profile uuid;
  author_user uuid;
  result jsonb;
begin
  perform public.assert_admin();

  select p.author_id into profile from public.poems p where p.id = admin_delete_poem.poem_id;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  select ap.user_id into author_user from public.author_profiles ap where ap.id = profile;

  result := public.delete_poem_of(profile, admin_delete_poem.poem_id);

  if result ->> 'status' = 'deleted' then
    perform public.log_moderation('delete-poem', author_user, 'poem', admin_delete_poem.poem_id);
  end if;

  return result;
end;
$$;

-- Delete any collection: the owner's delete for the row's own author, taking that author's advisory lock
-- (FR-9, FR-11).
create function public.admin_delete_collection(collection_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  profile uuid;
  author_user uuid;
  result jsonb;
begin
  perform public.assert_admin();

  select c.author_id into profile from public.collections c where c.id = admin_delete_collection.collection_id;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  select ap.user_id into author_user from public.author_profiles ap where ap.id = profile;

  result := public.delete_collection_of(profile, admin_delete_collection.collection_id);

  if result ->> 'status' = 'deleted' then
    perform public.log_moderation(
      'delete-collection', author_user, 'collection', admin_delete_collection.collection_id
    );
  end if;

  return result;
end;
$$;

-- Whether the public page may show an admin's delete control: an admin who is not the profile's owner (FR-10).
-- Not an admin_* function: it answers false, never an error, for anyone else.
create function public.may_moderate_author(author_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    and not exists (
      select 1 from public.author_profiles ap
      where ap.id = may_moderate_author.author_profile_id
        and ap.user_id = (select auth.uid())
    );
$$;

-- ---------- The sign-up hook (task 2.6, design D6) ----------

create function public.reject_banned_signup(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  address text;
begin
  address := event -> 'user' ->> 'email';

  if nullif(btrim(address), '') is not null and exists (
    select 1 from public.banned_emails b
    where b.email_hash = public.banned_email_hash(address)
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object('http_code', 403, 'message', 'signup not allowed')
    );
  end if;

  return '{}'::jsonb;
exception
  when others then
    -- Fail open on purpose, but not silently: a broken hook (a lost grant, a renamed table) would otherwise
    -- stop every ban from matching without a trace. The message names the error, never the address.
    raise warning 'reject_banned_signup failed: % (%)', sqlerrm, sqlstate;
    return '{}'::jsonb;
end;
$$;

-- ---------- Grants (NFR-1) ----------

revoke execute on function public.banned_email_hash(text) from public, anon, authenticated;
revoke execute on function public.apply_restriction(uuid, text) from public, anon, authenticated;
revoke execute on function public.log_moderation(text, uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.delete_poem_of(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.delete_collection_of(uuid, uuid) from public, anon, authenticated;

revoke execute on function public.admin_list_users(integer, timestamptz, uuid, text) from public, anon;
revoke execute on function public.admin_block_user(uuid) from public, anon;
revoke execute on function public.admin_unblock_user(uuid) from public, anon;
revoke execute on function public.admin_ban_user(uuid) from public, anon;
revoke execute on function public.admin_revoke_sessions(uuid) from public, anon;
revoke execute on function public.admin_delete_poem(uuid) from public, anon;
revoke execute on function public.admin_delete_collection(uuid) from public, anon;
revoke execute on function public.may_moderate_author(uuid) from public, anon;
grant execute on function public.admin_list_users(integer, timestamptz, uuid, text) to authenticated;
grant execute on function public.admin_block_user(uuid) to authenticated;
grant execute on function public.admin_unblock_user(uuid) to authenticated;
grant execute on function public.admin_ban_user(uuid) to authenticated;
grant execute on function public.admin_revoke_sessions(uuid) to authenticated;
grant execute on function public.admin_delete_poem(uuid) to authenticated;
grant execute on function public.admin_delete_collection(uuid) to authenticated;
grant execute on function public.may_moderate_author(uuid) to authenticated;

revoke execute on function public.reject_banned_signup(jsonb) from public, anon, authenticated;
grant execute on function public.reject_banned_signup(jsonb) to supabase_auth_admin;

-- ---------- Storage: an admin removes another author's illustration (task 2.3, design D11) ----------
-- The owner policies stay. `to authenticated` on purpose: `anon` cannot execute is_admin(), so a policy left on
-- the default role would turn an anonymous read into an error. Rows in storage.objects are never deleted from
-- SQL, which would orphan the object; the app removes the file through Storage with the admin's own session.

create policy "admins read poem illustrations" on storage.objects
  for select to authenticated
  using (bucket_id = 'poem-illustrations' and (select public.is_admin()));

create policy "admins delete poem illustrations" on storage.objects
  for delete to authenticated
  using (bucket_id = 'poem-illustrations' and (select public.is_admin()));
