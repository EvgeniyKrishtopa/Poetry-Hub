-- Admin moderation, part 1: the admin role and the restriction check (admin-moderation, design D1, D5).
-- Nothing in the app reads any of this yet: the admin functions, the storage policies for admins and the auth
-- hook come in the next migration.
--
-- Four closed tables (RLS on, no policies, no grants for anon and authenticated, ADR 0005): admins,
-- account_restrictions, banned_emails, moderation_log. Helpers: is_admin(), assert_admin(), is_restricted(),
-- assert_not_restricted(). A blocked or banned account (a row in account_restrictions) is refused by every
-- writer of user content with SQLSTATE AM001 (message `account restricted`) before any row changes, and by the
-- direct-write policies below. Reads are not affected.
--
-- Why AM001 and not 42501: existing writers raise 42501 for "not signed in" and assert_admin() raises it for
-- "not an admin", so the app could not tell a restriction from either. Checked on the local stack: PostgREST
-- answers a call refused with AM001 with HTTP 400 and the body {"code":"AM001","message":"account restricted",
-- "details":null,"hint":null}, so the `code` field alone carries the meaning (supabase-js exposes it as `error.code`).
-- A signed-out call to a function `anon` cannot execute is HTTP 401 with code 42501 (`permission denied`).
--
-- Task 1.1: the checklist of writers, found by grep over supabase/migrations/ (each one's latest definition
-- is the one re-created below, with `perform public.assert_not_restricted()` as its first statement):
--   security definer writers of user content that `authenticated` can execute:
--     public.ensure_my_author_profile()             20261015160958_author_profiles.sql
--     public.consume_write_allowance(text)          20261111160000_work_ordering.sql (sql -> plpgsql here)
--     public.create_my_poem(text, text, text, text) 20261028160000_poems.sql
--     public.can_create_poem()                      20261028160000_poems.sql (stable pre-check, no write)
--     public.update_my_poem(uuid, text, text, text, boolean, text)  20261103130000_update_my_poem.sql
--     public.delete_my_poem(uuid)                   20261029170000_delete_my_poem.sql
--     public.create_my_collection(text, text)       20261104180000_collections.sql
--     public.update_my_collection(uuid, text, text) 20261104180000_collections.sql
--     public.delete_my_collection(uuid)             20261111160000_work_ordering.sql
--     public.save_my_collection_poems(uuid, uuid[], uuid[])  20261111160000_work_ordering.sql
--     public.move_my_poem(uuid, uuid, uuid, integer)         20261111160000_work_ordering.sql
--     public.move_my_collection(uuid, integer)      20261111160000_work_ordering.sql
--   direct-write paths:
--     the `owners update their own profile` policy on public.author_profiles (column grant plus RLS)
--     the owner insert and delete policies on storage.objects for the buckets author-photos
--       (`owners upload author photos`, `owners delete author photos`) and poem-illustrations
--       (`authors upload poem illustrations`, `owners delete poem illustrations`)
--   deliberately not guarded (read-only helpers and internal functions no client role can execute):
--     is_public_author_profile, owns_public_author_folder, my_author_profile_id, owns_author_profile,
--     my_collection_poem_choices, my_collected_poems, poem_create_status, collection_create_status,
--     poem_create_limits, collection_create_limits, set_first_poem_position, set_first_collection_position,
--     log_poem_creation, log_collection_creation (the last four are triggers on rows a guarded writer inserts).
--   The owner `select` policies on both buckets stay: Storage's `remove` reads an object before deleting it,
--   and the delete policy above is what refuses a restricted owner.
--
-- Down migration (documented, never auto-run; revert the app first):
--   alter policy "owners update their own profile" on public.author_profiles
--     using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
--   alter policy "owners upload author photos" on storage.objects with check (
--     bucket_id = 'author-photos'
--     and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
--     and public.owns_author_profile((storage.foldername(name))[1]));
--   alter policy "owners delete author photos" on storage.objects
--     using (bucket_id = 'author-photos' and public.owns_author_profile((storage.foldername(name))[1]));
--   alter policy "authors upload poem illustrations" on storage.objects with check (
--     bucket_id = 'poem-illustrations'
--     and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
--     and public.owns_public_author_folder((storage.foldername(name))[1]));
--   alter policy "owners delete poem illustrations" on storage.objects
--     using (bucket_id = 'poem-illustrations' and public.owns_author_profile((storage.foldername(name))[1]));
--   then re-run, as `create or replace`, the previous body of every function in the checklist above from the
--   file named next to it (`consume_write_allowance` as the `language sql` body from
--   20261111160000_work_ordering.sql), and drop, in this order:
--   drop function if exists public.assert_not_restricted();
--   drop function if exists public.is_restricted();
--   drop function if exists public.assert_admin();
--   drop function if exists public.is_admin();
--   drop table if exists public.moderation_log;
--   drop table if exists public.banned_emails;
--   drop table if exists public.account_restrictions;
--   drop table if exists public.admins;

-- ---------- The tables ----------

-- The owner adds their own row by SQL; the app has no way to add or remove one (FR-1).
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- One row per blocked or banned account; it goes with the account. created_by is the admin's user id, a plain
-- uuid: deleting an admin's account must not be blocked by, or erase, what they did.
create table public.account_restrictions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('blocked', 'banned')),
  created_at timestamptz not null default now(),
  created_by uuid not null
);

-- The SHA-256 digest (hex) of a banned address, trimmed and lower-cased, never the address. No reference to an
-- account, so a ban of an address outlives the account's deletion.
create table public.banned_emails (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

-- What an admin did. The user ids carry no foreign key, so the history survives the deletion of any account;
-- no text of deleted content is ever copied here. Not readable by the app: the owner reads it in the dashboard.
create table public.moderation_log (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid not null,
  action         text not null,
  target_user_id uuid not null,
  target_kind    text not null,
  target_id      uuid not null,
  created_at     timestamptz not null default now()
);

-- No policies and no grants: only the definer functions touch these tables. Supabase grants every new public
-- table to anon and authenticated by default, so take that back.
alter table public.admins enable row level security;
alter table public.account_restrictions enable row level security;
alter table public.banned_emails enable row level security;
alter table public.moderation_log enable row level security;

revoke all on public.admins from anon, authenticated;
revoke all on public.account_restrictions from anon, authenticated;
revoke all on public.banned_emails from anon, authenticated;
revoke all on public.moderation_log from anon, authenticated;

-- ---------- The helpers ----------

-- Whether the caller is an admin. Takes no argument, so it cannot be used to probe other users. Executable by
-- authenticated only: a signed-out API caller gets a permission error, not an answer (FR-1).
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;

-- The first statement of every admin function: 42501 for a non-admin or a signed-out caller. Internal: the
-- admin functions run it as their owner, so no client role needs to execute it.
create function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
end;
$$;

-- Whether the caller's account is blocked or banned. Executable by authenticated, because the profile and
-- Storage policies evaluate it as that role. A signed-out caller has no row, so the answer is false.
create function public.is_restricted()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.account_restrictions r where r.user_id = (select auth.uid())
  );
$$;

-- The first statement of every writer of user content: AM001 `account restricted` for a blocked or banned
-- caller (design D5). Internal, like assert_admin(). `stable` so the read-only pre-check can call it.
create function public.assert_not_restricted()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.is_restricted() then
    raise exception 'account restricted' using errcode = 'AM001';
  end if;
end;
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.assert_admin() from public, anon, authenticated;
revoke execute on function public.is_restricted() from public, anon;
revoke execute on function public.assert_not_restricted() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_restricted() to authenticated;

-- ---------- The writers ----------
-- Each is re-created from its latest definition: same signature, arguments, answers, limits and locks, with
-- `perform public.assert_not_restricted()` added as the first statement, ahead of the signed-in check (a
-- signed-out caller is not restricted, so it still reaches 42501 there). `create or replace` keeps each
-- function's existing grants (authenticated only).

-- From 20261015160958_author_profiles.sql.
create or replace function public.ensure_my_author_profile()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  profile_id uuid;
begin
  perform public.assert_not_restricted();

  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  insert into public.author_profiles (user_id) values (caller) on conflict (user_id) do nothing;
  select p.id into profile_id from public.author_profiles p where p.user_id = caller;
  return profile_id;
end;
$$;

-- From 20261111160000_work_ordering.sql, with the same limits:
--   profile_write: 10 per 1 minute; photo_upload: 5 per 1 hour; poem_edit: 10 per 1 minute;
--   collection_edit: 10 per 1 minute; collection_poems_save: 10 per 1 minute; order_move: 30 per 1 minute.
-- It becomes plpgsql so the check can come first: the profile and photo actions call it before they touch the
-- table or Storage, so one guard covers those direct writes too. The scope argument keeps its name (the app
-- passes it by name) and is always written consume_write_allowance.scope; a bare `scope`, as in the
-- `on conflict` target, means the column, which is what `#variable_conflict use_column` says.
create or replace function public.consume_write_allowance(scope text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  allowed boolean;
begin
  perform public.assert_not_restricted();

  with limits (scope, max_hits, window_length) as (
    values
      ('profile_write', 10, interval '1 minute'),
      ('photo_upload', 5, interval '1 hour'),
      ('poem_edit', 10, interval '1 minute'),
      ('collection_edit', 10, interval '1 minute'),
      ('collection_poems_save', 10, interval '1 minute'),
      ('order_move', 30, interval '1 minute')
  ),
  counted as (
    insert into public.write_rate_limits as counter (user_id, scope, window_start, hits)
    values ((select auth.uid()), consume_write_allowance.scope, now(), 1)
    on conflict (user_id, scope) do update set
      window_start = case
        when counter.window_start <= now() - (select l.window_length from limits l where l.scope = counter.scope)
          then now()
        else counter.window_start
      end,
      hits = case
        when counter.window_start <= now() - (select l.window_length from limits l where l.scope = counter.scope)
          then 1
        else counter.hits + 1
      end
    returning counter.hits
  )
  select c.hits <= l.max_hits
  into allowed
  from counted c
  join limits l on l.scope = consume_write_allowance.scope;

  return allowed;
end;
$$;

-- From 20261028160000_poems.sql.
create or replace function public.create_my_poem(title text, text text, genre_id text, illustration_path text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  profile uuid;
  create_status text;
  poem_id uuid;
begin
  perform public.assert_not_restricted();

  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  profile := public.my_author_profile_id();

  -- Two concurrent calls of one author wait for each other here, so both can't pass the limit as the last
  -- allowed one: the second counts the first's committed row. No profile means 'not-public' and no lock.
  if profile is not null then
    perform pg_advisory_xact_lock(hashtextextended(profile::text, 0));
  end if;

  create_status := public.poem_create_status(profile);
  if create_status <> 'allowed' then
    return jsonb_build_object('status', create_status);
  end if;

  insert into public.poems (author_id, title, text, genre_id, illustration_path)
  values (
    profile,
    create_my_poem.title,
    create_my_poem.text,
    create_my_poem.genre_id,
    create_my_poem.illustration_path
  )
  returning id into poem_id;

  return jsonb_build_object('status', 'created', 'id', poem_id);
end;
$$;

-- From 20261028160000_poems.sql: the app's check before any upload, so a restricted user is refused before
-- anything is uploaded (ADR 0009 D5). Still `stable`, writes nothing.
create or replace function public.can_create_poem()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_not_restricted();

  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return jsonb_build_object('status', public.poem_create_status(public.my_author_profile_id()));
end;
$$;

-- From 20261103130000_update_my_poem.sql.
create or replace function public.update_my_poem(
  poem_id uuid,
  title text,
  text text,
  genre_id text,
  keep_illustration boolean,
  illustration_path text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  profile uuid;
  old_path text;
begin
  perform public.assert_not_restricted();

  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  if update_my_poem.keep_illustration is null then
    raise exception 'keep_illustration must be true or false' using errcode = '22004';
  end if;

  profile := public.my_author_profile_id();

  select p.illustration_path into old_path
  from public.poems p
  where p.id = update_my_poem.poem_id
    and p.author_id = profile
    and public.is_public_author_profile(profile)
  for update;

  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  update public.poems p set
    title = update_my_poem.title,
    text = update_my_poem.text,
    genre_id = update_my_poem.genre_id,
    illustration_path = case
      when update_my_poem.keep_illustration then p.illustration_path
      else update_my_poem.illustration_path
    end
  where p.id = update_my_poem.poem_id;

  return jsonb_build_object(
    'status', 'updated',
    'author_id', profile,
    'replaced_path', case when update_my_poem.keep_illustration then null else old_path end
  );
end;
$$;

-- From 20261029170000_delete_my_poem.sql.
create or replace function public.delete_my_poem(poem_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  deleted_author uuid;
  deleted_path text;
begin
  perform public.assert_not_restricted();

  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  delete from public.poems p
  where p.id = delete_my_poem.poem_id
    and p.author_id = public.my_author_profile_id()
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

-- From 20261104180000_collections.sql.
create or replace function public.create_my_collection(title text, description text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  profile uuid;
  create_status text;
  new_id uuid;
begin
  perform public.assert_not_restricted();

  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  profile := public.my_author_profile_id();

  -- Two concurrent calls of one author wait for each other here, so the second counts the first's committed
  -- creation. No profile means 'not-public' and no lock.
  if profile is not null then
    perform pg_advisory_xact_lock(hashtextextended(profile::text, 0));
  end if;

  create_status := public.collection_create_status(profile);
  if create_status <> 'allowed' then
    return jsonb_build_object('status', create_status);
  end if;

  insert into public.collections (author_id, title, description)
  values (profile, create_my_collection.title, create_my_collection.description)
  returning id into new_id;

  return jsonb_build_object('status', 'created', 'id', new_id);
end;
$$;

-- From 20261104180000_collections.sql.
create or replace function public.update_my_collection(collection_id uuid, title text, description text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  profile uuid;
begin
  perform public.assert_not_restricted();

  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  profile := public.my_author_profile_id();

  update public.collections c set
    title = update_my_collection.title,
    description = update_my_collection.description
  where c.id = update_my_collection.collection_id
    and c.author_id = profile
    and public.is_public_author_profile(profile);

  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  return jsonb_build_object('status', 'updated');
end;
$$;

-- From 20261111160000_work_ordering.sql.
create or replace function public.delete_my_collection(collection_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  profile uuid;
  free_first integer;
  freed_count integer;
  deleted_title text;
  deleted_author uuid;
begin
  perform public.assert_not_restricted();

  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  profile := public.my_author_profile_id();

  if profile is not null then
    perform pg_advisory_xact_lock(hashtextextended(profile::text, 0));

    -- The collection first, then its poems, the order every writer takes.
    perform 1 from public.collections c
    where c.id = delete_my_collection.collection_id and c.author_id = profile
    for update;

    if found then
      select coalesce(min(p.position), 0) into free_first from public.poems p
      where p.author_id = profile
        and p.collection_id is null;

      select count(*) into freed_count from public.poems p
      where p.author_id = profile
        and p.collection_id = delete_my_collection.collection_id;

      update public.poems p set position = free_first - freed_count + f.rn
      from (
        select q.id, row_number() over (order by q.position, q.id) - 1 as rn
        from public.poems q
        where q.author_id = profile
          and q.collection_id = delete_my_collection.collection_id
      ) f
      where p.id = f.id;
    end if;
  end if;

  delete from public.collections c
  where c.id = delete_my_collection.collection_id
    and c.author_id = profile
  returning c.title, c.author_id into deleted_title, deleted_author;

  if deleted_title is null then
    return jsonb_build_object('status', 'not-found');
  end if;

  return jsonb_build_object('status', 'deleted', 'title', deleted_title, 'author_id', deleted_author);
end;
$$;

-- From 20261111160000_work_ordering.sql.
create or replace function public.save_my_collection_poems(collection_id uuid, added uuid[], removed uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  max_poems_per_list constant integer := 1000;
  caller uuid := (select auth.uid());
  profile uuid;
  added_count integer;
  removed_count integer;
  collection_first integer;
  free_first integer;
begin
  perform public.assert_not_restricted();

  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  -- Its own statement, ahead of the guard below: array_position() raises 0A000 on a multi-dimensional
  -- array, and the order an `or` chain is evaluated in is not guaranteed. An empty list has no dimensions.
  if array_ndims(save_my_collection_poems.added) > 1 or array_ndims(save_my_collection_poems.removed) > 1 then
    raise exception 'invalid collection poems selection' using errcode = '22023';
  end if;

  if save_my_collection_poems.added is null
    or save_my_collection_poems.removed is null
    or array_position(save_my_collection_poems.added, null) is not null
    or array_position(save_my_collection_poems.removed, null) is not null
    or cardinality(save_my_collection_poems.added) > max_poems_per_list
    or cardinality(save_my_collection_poems.removed) > max_poems_per_list
    or cardinality(save_my_collection_poems.added) + cardinality(save_my_collection_poems.removed) = 0
    or (select count(distinct a) from unnest(save_my_collection_poems.added) a)
      <> cardinality(save_my_collection_poems.added)
    or (select count(distinct r) from unnest(save_my_collection_poems.removed) r)
      <> cardinality(save_my_collection_poems.removed)
    or save_my_collection_poems.added && save_my_collection_poems.removed
  then
    raise exception 'invalid collection poems selection' using errcode = '22023';
  end if;

  profile := public.my_author_profile_id();

  -- One serialization point per author: every writer of the order queues here. No profile means 'not-found'
  -- and no lock.
  if profile is not null then
    perform pg_advisory_xact_lock(hashtextextended(profile::text, 0));
  end if;

  if profile is null or not public.is_public_author_profile(profile) then
    return jsonb_build_object('status', 'not-found');
  end if;

  perform 1 from public.collections c
  where c.id = save_my_collection_poems.collection_id and c.author_id = profile
  for update;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  perform 1 from public.poems p
  where p.id = any (save_my_collection_poems.added || save_my_collection_poems.removed)
    and p.author_id = profile
  order by p.id
  for update;

  -- Counted after the locks, so a concurrent save's committed change is what decides.
  select count(*) into added_count from public.poems p
  where p.id = any (save_my_collection_poems.added)
    and p.author_id = profile
    and p.collection_id is null;

  select count(*) into removed_count from public.poems p
  where p.id = any (save_my_collection_poems.removed)
    and p.author_id = profile
    and p.collection_id = save_my_collection_poems.collection_id;

  if added_count <> cardinality(save_my_collection_poems.added)
    or removed_count <> cardinality(save_my_collection_poems.removed)
  then
    return jsonb_build_object('status', 'stale');
  end if;

  -- The first of each list before any of the updates below.
  select coalesce(min(p.position), 0) into collection_first from public.poems p
  where p.author_id = profile
    and p.collection_id = save_my_collection_poems.collection_id;

  select coalesce(min(p.position), 0) into free_first from public.poems p
  where p.author_id = profile
    and p.collection_id is null;

  update public.poems p set
    collection_id = save_my_collection_poems.collection_id,
    position = collection_first - added_count + a.rn
  from (
    select q.id, row_number() over (order by q.created_at desc, q.id) - 1 as rn
    from public.poems q
    where q.id = any (save_my_collection_poems.added)
  ) a
  where p.id = a.id;

  update public.poems p set
    collection_id = null,
    position = free_first - removed_count + r.rn
  from (
    select q.id, row_number() over (order by q.position, q.id) - 1 as rn
    from public.poems q
    where q.id = any (save_my_collection_poems.removed)
  ) r
  where p.id = r.id;

  return jsonb_build_object('status', 'saved');
end;
$$;

-- From 20261111160000_work_ordering.sql.
create or replace function public.move_my_poem(
  poem_id uuid,
  from_collection_id uuid,
  to_collection_id uuid,
  to_index integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  profile uuid;
  poem_collection uuid;
begin
  perform public.assert_not_restricted();

  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  if move_my_poem.poem_id is null or move_my_poem.to_index is null then
    raise exception 'invalid poem move' using errcode = '22023';
  end if;

  profile := public.my_author_profile_id();

  if profile is not null then
    perform pg_advisory_xact_lock(hashtextextended(profile::text, 0));
  end if;

  if profile is null or not public.is_public_author_profile(profile) then
    return jsonb_build_object('status', 'not-found');
  end if;

  perform 1 from public.collections c
  where c.author_id = profile
    and c.id in (move_my_poem.from_collection_id, move_my_poem.to_collection_id)
  order by c.id
  for update;

  if move_my_poem.to_collection_id is not null and not exists (
    select 1 from public.collections c
    where c.id = move_my_poem.to_collection_id and c.author_id = profile
  ) then
    return jsonb_build_object('status', 'not-found');
  end if;

  select p.collection_id into poem_collection from public.poems p
  where p.id = move_my_poem.poem_id and p.author_id = profile
  for update;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  if poem_collection is distinct from move_my_poem.from_collection_id then
    return jsonb_build_object('status', 'stale');
  end if;

  if move_my_poem.from_collection_id is distinct from move_my_poem.to_collection_id then
    update public.poems p set position = s.rn
    from (
      select q.id, row_number() over (order by q.position, q.id) - 1 as rn
      from public.poems q
      where q.author_id = profile
        and q.collection_id is not distinct from move_my_poem.from_collection_id
        and q.id <> move_my_poem.poem_id
    ) s
    where p.id = s.id;
  end if;

  with others as (
    select q.id, row_number() over (order by q.position, q.id) - 1 as rn
    from public.poems q
    where q.author_id = profile
      and q.collection_id is not distinct from move_my_poem.to_collection_id
      and q.id <> move_my_poem.poem_id
  ),
  place as (
    select least(greatest(move_my_poem.to_index, 0), (select count(*) from others))::integer as idx
  ),
  arranged as (
    select o.id, (o.rn + case when o.rn >= pl.idx then 1 else 0 end)::integer as new_position
    from others o cross join place pl
    union all
    select move_my_poem.poem_id, pl.idx from place pl
  )
  update public.poems p set
    collection_id = move_my_poem.to_collection_id,
    position = a.new_position
  from arranged a
  where p.id = a.id;

  return jsonb_build_object('status', 'moved', 'author_id', profile);
end;
$$;

-- From 20261111160000_work_ordering.sql.
create or replace function public.move_my_collection(collection_id uuid, to_index integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  profile uuid;
begin
  perform public.assert_not_restricted();

  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  if move_my_collection.collection_id is null or move_my_collection.to_index is null then
    raise exception 'invalid collection move' using errcode = '22023';
  end if;

  profile := public.my_author_profile_id();

  if profile is not null then
    perform pg_advisory_xact_lock(hashtextextended(profile::text, 0));
  end if;

  if profile is null or not public.is_public_author_profile(profile) then
    return jsonb_build_object('status', 'not-found');
  end if;

  perform 1 from public.collections c
  where c.author_id = profile
  order by c.id
  for update;

  if not exists (
    select 1 from public.collections c
    where c.id = move_my_collection.collection_id and c.author_id = profile
  ) then
    return jsonb_build_object('status', 'not-found');
  end if;

  with others as (
    select q.id, row_number() over (order by q.position, q.id) - 1 as rn
    from public.collections q
    where q.author_id = profile
      and q.id <> move_my_collection.collection_id
  ),
  place as (
    select least(greatest(move_my_collection.to_index, 0), (select count(*) from others))::integer as idx
  ),
  arranged as (
    select o.id, (o.rn + case when o.rn >= pl.idx then 1 else 0 end)::integer as new_position
    from others o cross join place pl
    union all
    select move_my_collection.collection_id, pl.idx from place pl
  )
  update public.collections c set position = a.new_position
  from arranged a
  where c.id = a.id;

  return jsonb_build_object('status', 'moved', 'author_id', profile);
end;
$$;

-- ---------- The direct-write policies ----------
-- The backstop against direct API calls (design D5). A refusal from Storage carries no "restricted" signal, so
-- the app never tries to detect it: the guarded pre-check above refuses first.

alter policy "owners update their own profile" on public.author_profiles
  using ((select auth.uid()) = user_id and not public.is_restricted())
  with check ((select auth.uid()) = user_id and not public.is_restricted());

alter policy "owners upload author photos" on storage.objects
  with check (
    bucket_id = 'author-photos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
    and public.owns_author_profile((storage.foldername(name))[1])
    and not public.is_restricted()
  );

alter policy "owners delete author photos" on storage.objects
  using (
    bucket_id = 'author-photos'
    and public.owns_author_profile((storage.foldername(name))[1])
    and not public.is_restricted()
  );

alter policy "authors upload poem illustrations" on storage.objects
  with check (
    bucket_id = 'poem-illustrations'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
    and public.owns_public_author_folder((storage.foldername(name))[1])
    and not public.is_restricted()
  );

alter policy "owners delete poem illustrations" on storage.objects
  using (
    bucket_id = 'poem-illustrations'
    and public.owns_author_profile((storage.foldername(name))[1])
    and not public.is_restricted()
  );
