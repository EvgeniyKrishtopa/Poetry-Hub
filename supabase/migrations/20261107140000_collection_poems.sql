-- Collection membership: which collection a poem belongs to, stored on the poem and private to its author
-- (add-poems-to-collections, design D2; NFR-1, FR-1, FR-4, FR-6, FR-7, FR-8, FR-11).
--
-- Poems are public rows, so neither RLS (per row) nor the column grant (per role) can say "only the row's
-- owner sees this column". poems.collection_id therefore gets no grant at all: no client role can select or
-- change it. The author reads it only through my_collection_poem_choices() and my_collected_poems(), and
-- changes it only through save_my_collection_poems(), security definer functions that take the owner from
-- auth.uid() and my_author_profile_id() and never from an argument. Their own caller filter is the last line
-- of defence (ADR 0012, which amends ADR 0011 §1 and ADR 0005 §1 for this case).
--
-- A composite foreign key to collections (id, author_id) makes "a poem only in its own author's collection"
-- a database fact. Deleting a collection frees its poems; deleting a poem needs nothing. create_my_poem(),
-- update_my_poem(), and delete_my_poem() are unchanged: each names its columns, so a new poem starts free
-- and an edit keeps its collection. Every existing poem starts free.
--
-- The save limit is a new scope of ADR 0007's per-user counter, collection_poems_save, checked by the app
-- before the save.
--
-- Down migration (documented, never auto-run; revert the app first, its pages call the functions; every
-- membership is lost):
--   drop function if exists public.save_my_collection_poems(uuid, uuid[], uuid[]);
--   drop function if exists public.my_collected_poems();
--   drop function if exists public.my_collection_poem_choices(uuid);
--   drop index if exists public.poems_collection_created_idx;
--   alter table public.poems drop constraint if exists poems_collection_same_author;
--   alter table public.poems drop column if exists collection_id;
--   alter table public.collections drop constraint if exists collections_id_author_key;
--   delete from public.write_rate_limits where scope = 'collection_poems_save';
--   alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
--   alter table public.write_rate_limits add constraint write_rate_limits_scope_check
--     check (scope in ('profile_write', 'photo_upload', 'poem_edit', 'collection_edit'));
--   then re-run the `create or replace function public.consume_write_allowance` statement below without
--   the ('collection_poems_save', 10, interval '1 minute') row.

-- ---------- Membership on the poem ----------

-- The target of the composite foreign key below. id alone is already unique; the pair adds the author.
alter table public.collections add constraint collections_id_author_key unique (id, author_id);

alter table public.poems add column collection_id uuid;

-- A poem joins only a collection of its own author. MATCH SIMPLE: a null collection_id (a free poem) is not
-- checked. Deleting a collection clears collection_id only and keeps author_id (Postgres 15+).
alter table public.poems add constraint poems_collection_same_author
  foreign key (collection_id, author_id) references public.collections (id, author_id)
  on delete set null (collection_id);

-- One collection's poems, newest first; also the foreign key's lookup when a collection is deleted.
create index poems_collection_created_idx on public.poems (collection_id, created_at desc, id)
  where collection_id is not null;

-- No grant: the existing grant on poems names its columns, so the new one is unreadable and unwritable by
-- anon and authenticated (ADR 0012). Verified by pgTAP.

-- ---------- Reading membership ----------

-- The poems the collection poems page lists: the caller's own poems in this collection (selected) and their
-- free poems (not selected), newest first. No rows when the collection isn't the caller's, or the caller has
-- no profile. Not gated by public status: the page's own collection read answers that first. Arguments are
-- always written <function>.<name>: in SQL functions a column of the same name would win.
create function public.my_collection_poem_choices(collection_id uuid)
returns table (id uuid, title text, selected boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.title, p.collection_id is not null
  from public.poems p
  where p.author_id = (select public.my_author_profile_id())
    and exists (
      select 1 from public.collections c
      where c.id = my_collection_poem_choices.collection_id
        and c.author_id = p.author_id
    )
    and (p.collection_id = my_collection_poem_choices.collection_id or p.collection_id is null)
  order by p.created_at desc, p.id;
$$;

-- The caller's own poems that are in a collection, newest first, for the section on /account/poems.
create function public.my_collected_poems()
returns table (collection_id uuid, id uuid, title text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.collection_id, p.id, p.title
  from public.poems p
  where p.author_id = (select public.my_author_profile_id())
    and p.collection_id is not null
  order by p.created_at desc, p.id;
$$;

-- ---------- Saving membership ----------

-- Adds the caller's own free poems in `added` to one of the caller's own collections and frees the poems in
-- `removed` that are in it, all in one go or nothing. Answers {"status": "saved"}; {"status": "not-found"}
-- for no profile, a non-public one, or a collection that isn't the caller's (another author's and an unknown
-- id answer alike); {"status": "stale"} with nothing written when any poem is not the caller's, no longer
-- free, no longer in this collection, or gone. Changes no other column.
--
-- Malformed input raises 22023: the app validates first, so this guards direct calls only. 1000 per list
-- matches the app's MAX_POEMS_PER_SAVE; keep the two in step.
--
-- Locks: the collection row first, then the poems in id order, the same order every save takes, so two saves
-- never deadlock. A second save wanting a poem the first just took waits on its row lock, then sees it taken
-- and answers 'stale' (FR-8, NFR-1). delete_my_collection() also locks the collection before its poems.
create function public.save_my_collection_poems(collection_id uuid, added uuid[], removed uuid[])
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
begin
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

  update public.poems p set collection_id = save_my_collection_poems.collection_id
  where p.id = any (save_my_collection_poems.added);

  update public.poems p set collection_id = null
  where p.id = any (save_my_collection_poems.removed);

  return jsonb_build_object('status', 'saved');
end;
$$;

revoke execute on function public.my_collection_poem_choices(uuid) from public, anon;
revoke execute on function public.my_collected_poems() from public, anon;
revoke execute on function public.save_my_collection_poems(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.my_collection_poem_choices(uuid) to authenticated;
grant execute on function public.my_collected_poems() to authenticated;
grant execute on function public.save_my_collection_poems(uuid, uuid[], uuid[]) to authenticated;

-- ---------- The save limit ----------

alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
alter table public.write_rate_limits add constraint write_rate_limits_scope_check
  check (scope in ('profile_write', 'photo_upload', 'poem_edit', 'collection_edit', 'collection_poems_save'));

-- Same body as in 20261104180000_collections.sql, with collection_poems_save added to the limits:
--   profile_write: 10 per 1 minute; photo_upload: 5 per 1 hour; poem_edit: 10 per 1 minute;
--   collection_edit: 10 per 1 minute; collection_poems_save: 10 per 1 minute.
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
      ('collection_edit', 10, interval '1 minute'),
      ('collection_poems_save', 10, interval '1 minute')
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
