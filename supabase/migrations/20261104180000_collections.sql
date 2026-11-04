-- Collections: an author's own named groups of their poems, private to that author
-- (add-poem-collections, design D2; NFR-1, FR-3, FR-4, FR-5, FR-9, FR-10, FR-11, FR-13).
--
-- Follows ADR 0005: RLS decides which rows a caller sees, column grants decide which columns, and no client
-- role has an insert, update, or delete grant. Unlike poems, collections are private: anon gets nothing, and
-- a signed-in reader sees only their own rows. The only writes are create_my_collection(),
-- update_my_collection(), and delete_my_collection(), security definer functions that take the owner from
-- auth.uid() and my_author_profile_id() and never from an argument.
--
-- The create limit counts a creation log filled by an insert trigger, so a deleted collection still counts
-- until it ages out (ADR 0010's shape, as for poems). The edit limit is a new scope of ADR 0007's per-user
-- counter, collection_edit, checked by the app before the update.
--
-- Down migration (documented, never auto-run; revert the app first, its pages read the table and its
-- actions call the functions):
--   drop function if exists public.delete_my_collection(uuid);
--   drop function if exists public.update_my_collection(uuid, text, text);
--   drop function if exists public.create_my_collection(text, text);
--   drop function if exists public.collection_create_status(uuid);
--   drop trigger if exists collections_log_creation on public.collections;
--   drop function if exists public.log_collection_creation();
--   drop table if exists public.collection_creations;
--   drop function if exists public.collection_create_limits();
--   drop table if exists public.collections;
--   delete from public.write_rate_limits where scope = 'collection_edit';
--   alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
--   alter table public.write_rate_limits add constraint write_rate_limits_scope_check
--     check (scope in ('profile_write', 'photo_upload', 'poem_edit'));
--   then re-run the `create or replace function public.consume_write_allowance` statement below without
--   the ('collection_edit', 10, interval '1 minute') row.

-- ---------- The collections table ----------

create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.author_profiles (id) on delete cascade,
  -- Blank means what the app's trim() removes: the explicit class copied from 20261028160000_poems.sql
  -- (keep the two in step). char_length counts code points, like the form's trimmedLength. A blank
  -- description is stored as null by the app; the check rejects '' so there is one way to say "none".
  title       text not null check (char_length(title) <= 80 and title !~ E'^[\t\n\u000B\f\r    -     　﻿]*$'),
  description text check (
    description is null
    or (char_length(description) <= 1000 and description !~ E'^[\t\n\u000B\f\r    -     　﻿]*$')
  ),
  created_at  timestamptz not null default now()
);

-- One author's list, newest first.
create index collections_author_created_idx on public.collections (author_id, created_at desc, id);

alter table public.collections enable row level security;

-- Own rows only, public profile or not. `(select …)` lets Postgres evaluate the function once per query.
create policy "owners read their collections" on public.collections
  for select to authenticated
  using (author_id = (select public.my_author_profile_id()));

-- No insert, update, or delete policy or grant: the three functions below are the only writes. Supabase
-- grants every new public table to anon and authenticated by default, so start from nothing.
revoke all on public.collections from anon, authenticated;
grant select (id, author_id, title, description, created_at) on public.collections to authenticated;

-- ---------- The create limits ----------

-- The one home of the create limits: at most max_collections creations within any window_length (a sliding
-- window up to now, not a calendar month). Read by collection_create_status() to decide, and by the creation
-- log to know how far back it must keep rows. Internal: no client role can execute it.
create function public.collection_create_limits()
returns table (window_length interval, max_collections integer)
language sql
immutable
set search_path = ''
as $$
  values
    (interval '30 days', 50);
$$;

revoke execute on function public.collection_create_limits() from public, anon, authenticated;

-- ---------- The creation log ----------

-- One row per stored collection: who created it and when. A delete removes the collection, never its row
-- here, so a deleted collection keeps its place in the window until it ages out (FR-5). No content, only
-- author and time. The table is new, so there is nothing to backfill.
create table public.collection_creations (
  author_id  uuid not null references public.author_profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index collection_creations_author_created_idx on public.collection_creations (author_id, created_at);

-- No policies and no grants: only the trigger and the definer functions below touch the table.
alter table public.collection_creations enable row level security;
revoke all on public.collection_creations from anon, authenticated;

-- Logs each stored collection with its own created_at, then drops that author's rows that no window counts
-- any more, so the table stays bounded. Inside create_my_collection() it runs under that function's advisory
-- lock, so two concurrent creates can't both pass as the last allowed one.
create function public.log_collection_creation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.collection_creations (author_id, created_at) values (new.author_id, new.created_at);

  delete from public.collection_creations c
  where c.author_id = new.author_id
    and c.created_at <= now() - (select max(l.window_length) from public.collection_create_limits() l);

  return null;
end;
$$;

revoke execute on function public.log_collection_creation() from public, anon, authenticated;

create trigger collections_log_creation
  after insert on public.collections
  for each row execute function public.log_collection_creation();

-- 'not-public' for no profile or a non-public one, 'over-limit' when a window is full, otherwise 'allowed'.
-- Internal: no client role can execute it.
create function public.collection_create_status(profile uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when collection_create_status.profile is null
      or not public.is_public_author_profile(collection_create_status.profile) then 'not-public'
    when exists (
      select 1 from public.collection_create_limits() l
      where (
        select count(*) from public.collection_creations c
        where c.author_id = collection_create_status.profile
          and c.created_at > now() - l.window_length
      ) >= l.max_collections
    ) then 'over-limit'
    else 'allowed'
  end;
$$;

revoke execute on function public.collection_create_status(uuid) from public, anon, authenticated;

-- ---------- Creating a collection ----------

-- Stores one collection for the caller's own public profile and returns {"status": "created", "id": "<uuid>"},
-- or {"status": "not-public" | "over-limit"} with nothing stored. The table checks reject a blank or
-- over-long title, an over-long description, and '' (23514). No read-only twin like can_create_poem(): there
-- is no upload to spare. Arguments are always written create_my_collection.<name>: in plpgsql a bare `title`
-- next to the `title` column is ambiguous.
create function public.create_my_collection(title text, description text)
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

-- ---------- Updating a collection ----------

-- Changes the title and description of one collection of the caller's own public profile and returns
-- {"status": "updated"}, or {"status": "not-found"} with nothing changed: another author's collection, an
-- unknown id, and a non-public own profile answer alike (FR-11). id, author_id, and created_at never change.
create function public.update_my_collection(collection_id uuid, title text, description text)
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

-- ---------- Deleting a collection ----------

-- Deletes one collection of the caller's own profile and returns {"status": "deleted", "title": "<title>"},
-- or {"status": "not-found"} when no such collection is the caller's. Not gated by public status, as
-- delete_my_poem(): an owner may always remove their own rows. The stored title feeds the deleted notice,
-- so the app never trusts one from the browser.
create function public.delete_my_collection(collection_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  deleted_title text;
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  delete from public.collections c
  where c.id = delete_my_collection.collection_id
    and c.author_id = public.my_author_profile_id()
  returning c.title into deleted_title;

  if deleted_title is null then
    return jsonb_build_object('status', 'not-found');
  end if;

  return jsonb_build_object('status', 'deleted', 'title', deleted_title);
end;
$$;

revoke execute on function public.create_my_collection(text, text) from public, anon;
revoke execute on function public.update_my_collection(uuid, text, text) from public, anon;
revoke execute on function public.delete_my_collection(uuid) from public, anon;
grant execute on function public.create_my_collection(text, text) to authenticated;
grant execute on function public.update_my_collection(uuid, text, text) to authenticated;
grant execute on function public.delete_my_collection(uuid) to authenticated;

-- ---------- The edit limit ----------

alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
alter table public.write_rate_limits add constraint write_rate_limits_scope_check
  check (scope in ('profile_write', 'photo_upload', 'poem_edit', 'collection_edit'));

-- Same body as in 20261103130000_update_my_poem.sql, with collection_edit added to the limits:
--   profile_write: 10 per 1 minute; photo_upload: 5 per 1 hour; poem_edit: 10 per 1 minute;
--   collection_edit: 10 per 1 minute.
-- `create or replace` keeps the existing grants (authenticated only).
create or replace function public.consume_write_allowance(scope text)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  with limits (scope, max_hits, window_length) as (
    values
      ('profile_write', 10, interval '1 minute'),
      ('photo_upload', 5, interval '1 hour'),
      ('poem_edit', 10, interval '1 minute'),
      ('collection_edit', 10, interval '1 minute')
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
  from counted c
  join limits l on l.scope = consume_write_allowance.scope;
$$;
