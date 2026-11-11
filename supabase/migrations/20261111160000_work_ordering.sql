-- Work ordering: the author's own order of their collections, of each collection's poems, and of their free
-- poems (drag-and-drop-ordering, design D1, D2).
--
-- The order is an integer `position` on the row, per container: collections.position (the container is the
-- author) and poems.position (the container is the author's free poems when collection_id is null, otherwise
-- that collection). Lists read `order by position, id`. ADR 0014 records the model.
--
-- Follows ADR 0005 and ADR 0013: both columns get a select grant for anon and authenticated, exactly where
-- collection_id has one, and no client role gains an insert, update, or delete grant. The order and the
-- membership change only through definer functions that take the owner from auth.uid() and
-- my_author_profile_id(): the two new move functions, and the changed save_my_collection_poems() and
-- delete_my_collection(). Every writer of one author takes the same per-author advisory lock
-- (pg_advisory_xact_lock(hashtextextended(<profile>::text, 0)), the one the creates already take) first, so
-- writes of one author queue and never deadlock; row locks inside are taken in a fixed order (collections by
-- id, then poems by id).
--
-- A before-insert trigger on each table gives a row that names no position the first one of its container, so
-- create_my_poem(), create_my_collection(), the seed, and every fixture that inserts rows directly need no
-- change. Deletes leave gaps (gaps keep the order); a move renumbers the lists it touches to 0..n-1.
--
-- The move limit is a new scope of ADR 0007's per-user counter, order_move (30 per minute), checked by the
-- app before the move. Keep the number in step with MOVE_LIMIT_PER_MINUTE in the work-ordering feature.
--
-- Down migration (documented, never auto-run; revert the app first, its board calls the move functions and
-- its pages read the columns; every stored order is lost, the lists fall back to the id order):
--   drop function if exists public.move_my_collection(uuid, integer);
--   drop function if exists public.move_my_poem(uuid, uuid, uuid, integer);
--   drop trigger if exists poems_set_position on public.poems;
--   drop trigger if exists collections_set_position on public.collections;
--   drop function if exists public.set_first_poem_position();
--   drop function if exists public.set_first_collection_position();
--   drop index if exists public.poems_author_collection_position_idx;
--   drop index if exists public.collections_author_position_idx;
--   create index poems_collection_created_idx on public.poems (collection_id, created_at desc, id)
--     where collection_id is not null;
--   create index collections_author_created_idx on public.collections (author_id, created_at desc, id);
--   revoke select (position) on public.poems from anon, authenticated;
--   revoke select (position) on public.collections from anon, authenticated;
--   alter table public.poems drop column position;
--   alter table public.collections drop column position;
--   delete from public.write_rate_limits where scope = 'order_move';
--   alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
--   alter table public.write_rate_limits add constraint write_rate_limits_scope_check
--     check (scope in ('profile_write', 'photo_upload', 'poem_edit', 'collection_edit', 'collection_poems_save'));
--   then re-run, as `create or replace`, the statements that define the previous bodies:
--   `public.consume_write_allowance`, `public.save_my_collection_poems`, and `public.my_collected_poems` from
--   20261107140000_collection_poems.sql, and `public.delete_my_collection` from
--   20261110180000_public_collections.sql.

-- ---------- The columns ----------

alter table public.collections add column position integer;
alter table public.poems add column position integer;

-- Backfill: every row starts where "newest created first" put it, so applying the change moves nothing (FR-1).
update public.collections c set position = r.rn
from (
  select q.id, row_number() over (partition by q.author_id order by q.created_at desc, q.id) - 1 as rn
  from public.collections q
) r
where c.id = r.id;

-- The partition by collection_id puts the free poems (null) in one partition of their own.
update public.poems p set position = r.rn
from (
  select q.id, row_number() over (partition by q.author_id, q.collection_id order by q.created_at desc, q.id) - 1 as rn
  from public.poems q
) r
where p.id = r.id;

alter table public.collections alter column position set not null;
alter table public.poems alter column position set not null;

-- ---------- A new row goes first ----------

-- Gives an inserted collection the first position of its author's list when the insert names none. Not null is
-- checked after before-triggers, so the column can be not null. The lock is the author's advisory lock the
-- writers below take; inside create_my_collection() it is already held, and taking it again is free.
-- Internal: no client role can execute it.
create function public.set_first_collection_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.position is null then
    perform pg_advisory_xact_lock(hashtextextended(new.author_id::text, 0));

    select coalesce(min(c.position), 0) - 1 into new.position
    from public.collections c
    where c.author_id = new.author_id;
  end if;

  return new;
end;
$$;

-- The same for a poem: first among its author's free poems, or first in its collection when the insert names
-- one. Internal: no client role can execute it.
create function public.set_first_poem_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.position is null then
    perform pg_advisory_xact_lock(hashtextextended(new.author_id::text, 0));

    select coalesce(min(p.position), 0) - 1 into new.position
    from public.poems p
    where p.author_id = new.author_id
      and p.collection_id is not distinct from new.collection_id;
  end if;

  return new;
end;
$$;

revoke execute on function public.set_first_collection_position() from public, anon, authenticated;
revoke execute on function public.set_first_poem_position() from public, anon, authenticated;

create trigger collections_set_position
  before insert on public.collections
  for each row execute function public.set_first_collection_position();

create trigger poems_set_position
  before insert on public.poems
  for each row execute function public.set_first_poem_position();

-- ---------- Indexes ----------

-- One author's collections in their order.
drop index public.collections_author_created_idx;
create index collections_author_position_idx on public.collections (author_id, position, id);

-- One list of an author's poems in its order (collection_id null is the free poems); also the composite
-- foreign key's lookup when a collection is deleted, which the dropped index served.
drop index public.poems_collection_created_idx;
create index poems_author_collection_position_idx on public.poems (author_id, collection_id, position, id);

-- ---------- Reading ----------

-- Exactly where collection_id has one. The rows stay the ones each table's policies already allow, so a
-- non-public author's order stays unreadable; no role gains an update grant on any column.
grant select (position) on public.collections to anon, authenticated;
grant select (position) on public.poems to anon, authenticated;

-- ---------- The move limit ----------

alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
alter table public.write_rate_limits add constraint write_rate_limits_scope_check
  check (scope in ('profile_write', 'photo_upload', 'poem_edit', 'collection_edit', 'collection_poems_save', 'order_move'));

-- Same body as in 20261107140000_collection_poems.sql, with order_move added to the limits:
--   profile_write: 10 per 1 minute; photo_upload: 5 per 1 hour; poem_edit: 10 per 1 minute;
--   collection_edit: 10 per 1 minute; collection_poems_save: 10 per 1 minute; order_move: 30 per 1 minute.
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
  from counted c
  join limits l on l.scope = consume_write_allowance.scope;
$$;

-- ---------- Functions that keep their signature ----------

-- The caller's own poems that are in a collection, in their stored order, for the owner's pages. Same
-- signature and rules as in 20261107140000_collection_poems.sql; only the order changes. `create or replace`
-- keeps the existing grants (authenticated only).
create or replace function public.my_collected_poems()
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
  order by p.position, p.id;
$$;

-- Same signature, arguments, answers, validation, and lock order as in 20261107140000_collection_poems.sql
-- (FR-10), plus: the author's advisory lock, and the order. The poems added become the first of the
-- collection, in the order of the page's checklist (newest created first, then id); the poems removed become
-- the first of the free poems, in the order they had in the collection; no other item moves. Positions are
-- taken below the current first of each list, so nothing else is renumbered. `create or replace` keeps the
-- existing grants (authenticated only).
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

-- Same signature and answers as in 20261110180000_public_collections.sql, plus: the author's advisory lock, the
-- collection row locked before its poems, and the poems it frees placed first among the free poems, in their
-- collection order, before the delete (FR-1; without it their old positions would collide with the free list's
-- and interleave by id). Not gated by public status: an owner may always remove their own rows. `create or
-- replace` keeps the existing grants (authenticated only).
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

-- ---------- Moving ----------

-- Moves one poem of the caller's own public profile to a collection (to_collection_id) or to the free poems
-- (null) at a place, and returns {"status": "moved", "author_id": "<uuid>"} (the app needs the author to expire
-- the public tag); {"status": "stale"} with nothing written when the poem no longer is where the browser saw it
-- (from_collection_id, null = free); {"status": "not-found"} with nothing written for a poem or a target
-- collection that is not the caller's, an unknown id, no profile, or a non-public one (another author's and an
-- unknown id answer alike, FR-11). The source list (when it differs) and the target list are renumbered to
-- 0..n-1 in one statement each, in this transaction, with the moved poem at its place. A place below the start
-- becomes the start, one beyond the end becomes the end (NFR-1). A null poem id or place raises 22023: the app
-- validates first, so this guards direct calls only.
--
-- Locks: the author's advisory lock first, then the collections involved in id order, then the poem. Arguments
-- are always written move_my_poem.<name>.
create function public.move_my_poem(
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

-- Moves one collection of the caller's own public profile to a place among their collections and returns
-- {"status": "moved", "author_id": "<uuid>"}, or {"status": "not-found"} with nothing written for a collection
-- that is not the caller's, an unknown id, no profile, or a non-public one. The author's collections are
-- renumbered to 0..n-1 in one statement with the moved one at its place, clamped like move_my_poem(); its
-- poems keep their own positions. A null id or place raises 22023.
--
-- Locks: the author's advisory lock first, then all the author's collections in id order. Arguments are always
-- written move_my_collection.<name>.
create function public.move_my_collection(collection_id uuid, to_index integer)
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

revoke execute on function public.move_my_poem(uuid, uuid, uuid, integer) from public, anon;
revoke execute on function public.move_my_collection(uuid, integer) from public, anon;
grant execute on function public.move_my_poem(uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.move_my_collection(uuid, integer) to authenticated;
