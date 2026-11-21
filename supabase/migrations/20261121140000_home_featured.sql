-- The admin's choice for the home page: two closed tables, the guarded functions that change them, the admin's
-- list and the public read of the chosen ids (home-page-sections, design D1 to D3; tasks 1.2 to 1.4).
--
-- Nothing in the app reads any of this yet. Push it before the app: an old app against this database keeps
-- working, because nothing reads the tables.
--
-- home_featured_poems and home_featured_authors are closed like violation_cases (RLS on, no policy, no grant for
-- anon and authenticated, ADR 0005): only the definer functions below touch them. Each holds at most 4 rows:
-- `position between 1 and 4` with `unique (position)` is the cap (FR-10). The unique constraint is deferrable and
-- initially deferred, so a statement that shifts several positions is checked at commit, not row by row. The
-- foreign keys with `on delete cascade` free a slot when a poem or a profile is deleted, by any path (the
-- author's delete, the admin's delete, a deleted account), with no trigger and no job (FR-11). A cascade leaves a
-- gap in the positions and renumbers nothing; every function below treats a position as the entry's rank in the
-- list (1 to n in stored order), so a gap never shows and never blocks an add.
--
-- New admin functions (security definer, empty search_path, assert_admin() first, executable by authenticated
-- only): admin_add_home_poem, admin_add_home_author, admin_move_home_entry, admin_remove_home_entry (volatile) and
-- admin_list_home_entries (stable, so admin_foundation.test.sql's unguarded_writers view does not list it). Each
-- write takes a transaction advisory lock named for its list before it reads the count, so two simultaneous adds
-- cannot both pass the cap (the unique position is the second safety net).
--
-- Answers are jsonb with a status. Add: added | limit-reached | already-in-list | not-found. The checks run in
-- this order: an unknown or non-public target (not-found; a poem is public when its author is, a profile when it
-- has a first and last name), an entry already in the list (already-in-list, even on a full list, because that is
-- the more useful thing to tell the admin), a full list (limit-reached). Move: moved | stale | not-found (stale:
-- the entry is no longer at from_position, because another admin or a cascade delete changed the list, nothing is
-- written). Remove: removed | not-found. A call that changes nothing writes nothing. An argument outside the
-- contract (a kind other than `poem` and `author`, a missing position) is refused with 22023.
--
-- home_featured_ids() is the one public read: security definer, executable by anon and authenticated, declared
-- stable and not named admin_*. It returns only the two ordered id lists, and only entries whose author is public
-- (FR-10). An author who stops being public keeps the entry; admin_list_home_entries shows it with shown = false
-- so no slot is held invisibly (FR-11).
--
-- The shared compaction bodies are not named admin_*: admin_functions.test.sql requires assert_admin() in every
-- admin_% function, and these are revoked from every client role and called only by the guarded functions (the
-- same split ADR 0015 made for delete_poem_of).
--
-- Down migration (documented, never auto-run; revert the app first; the choice is lost, nothing else changes):
--   drop function if exists public.home_featured_ids();
--   drop function if exists public.admin_list_home_entries();
--   drop function if exists public.admin_remove_home_entry(text, uuid);
--   drop function if exists public.admin_move_home_entry(text, uuid, integer, integer);
--   drop function if exists public.admin_add_home_author(uuid);
--   drop function if exists public.admin_add_home_poem(uuid);
--   drop function if exists public.compact_home_featured_authors();
--   drop function if exists public.compact_home_featured_poems();
--   drop table if exists public.home_featured_authors;
--   drop table if exists public.home_featured_poems;

-- ---------- The tables (task 1.2) ----------

create table public.home_featured_poems (
  poem_id    uuid primary key references public.poems (id) on delete cascade,
  position   smallint not null check (position between 1 and 4),
  created_at timestamptz not null default now(),
  constraint home_featured_poems_position_key unique (position) deferrable initially deferred
);

create table public.home_featured_authors (
  author_id  uuid primary key references public.author_profiles (id) on delete cascade,
  position   smallint not null check (position between 1 and 4),
  created_at timestamptz not null default now(),
  constraint home_featured_authors_position_key unique (position) deferrable initially deferred
);

alter table public.home_featured_poems enable row level security;
alter table public.home_featured_authors enable row level security;
revoke all on public.home_featured_poems from anon, authenticated;
revoke all on public.home_featured_authors from anon, authenticated;

-- ---------- Compaction (task 1.3) ----------

-- Renumbers a list to 1..n in its stored order. The callers hold the list's advisory lock.
create function public.compact_home_featured_poems()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.home_featured_poems fp
  set position = ranked.rank
  from (
    select q.poem_id as entry, (row_number() over (order by q.position, q.poem_id))::smallint as rank
    from public.home_featured_poems q
  ) ranked
  where ranked.entry = fp.poem_id and fp.position <> ranked.rank;
$$;

create function public.compact_home_featured_authors()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.home_featured_authors fa
  set position = ranked.rank
  from (
    select q.author_id as entry, (row_number() over (order by q.position, q.author_id))::smallint as rank
    from public.home_featured_authors q
  ) ranked
  where ranked.entry = fa.author_id and fa.position <> ranked.rank;
$$;

-- ---------- Adding (task 1.3; FR-8, FR-10) ----------

create function public.admin_add_home_poem(poem_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  list_size integer;
  limit_size constant integer := 4;
begin
  perform public.assert_admin();

  perform pg_advisory_xact_lock(hashtextextended('home_featured_poems', 0));

  if not exists (
    select 1 from public.poems p
    where p.id = admin_add_home_poem.poem_id and public.is_public_author_profile(p.author_id)
  ) then
    return jsonb_build_object('status', 'not-found');
  end if;

  if exists (select 1 from public.home_featured_poems fp where fp.poem_id = admin_add_home_poem.poem_id) then
    return jsonb_build_object('status', 'already-in-list');
  end if;

  -- A cascade delete can leave a gap. Compacting first makes the count the cap check and n + 1 a free place.
  perform public.compact_home_featured_poems();

  select count(*)::integer into list_size from public.home_featured_poems;
  if list_size >= limit_size then
    return jsonb_build_object('status', 'limit-reached');
  end if;

  insert into public.home_featured_poems (poem_id, position)
  values (admin_add_home_poem.poem_id, list_size + 1);

  return jsonb_build_object('status', 'added');
end;
$$;

-- The public pages know a profile id, and so does the table.
create function public.admin_add_home_author(author_profile_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  list_size integer;
  limit_size constant integer := 4;
begin
  perform public.assert_admin();

  perform pg_advisory_xact_lock(hashtextextended('home_featured_authors', 0));

  if not public.is_public_author_profile(admin_add_home_author.author_profile_id) then
    return jsonb_build_object('status', 'not-found');
  end if;

  if exists (
    select 1 from public.home_featured_authors fa where fa.author_id = admin_add_home_author.author_profile_id
  ) then
    return jsonb_build_object('status', 'already-in-list');
  end if;

  perform public.compact_home_featured_authors();

  select count(*)::integer into list_size from public.home_featured_authors;
  if list_size >= limit_size then
    return jsonb_build_object('status', 'limit-reached');
  end if;

  insert into public.home_featured_authors (author_id, position)
  values (admin_add_home_author.author_profile_id, list_size + 1);

  return jsonb_build_object('status', 'added');
end;
$$;

-- ---------- Moving and removing (task 1.3; FR-9, FR-11) ----------

-- Puts an entry at to_position (clamped into the list) and renumbers the list to 1..n in one statement, the way
-- ADR 0014's move_my_poem does. from_position is the rank the browser saw: a different rank now means the list
-- changed meanwhile, and nothing is written. Moving an entry to the place it already has writes nothing.
create function public.admin_move_home_entry(kind text, id uuid, from_position integer, to_position integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_rank integer;
  list_size integer;
  target_rank integer;
begin
  perform public.assert_admin();

  if admin_move_home_entry.kind is null
    or admin_move_home_entry.kind not in ('poem', 'author')
    or admin_move_home_entry.id is null
    or admin_move_home_entry.from_position is null
    or admin_move_home_entry.to_position is null
  then
    raise exception 'invalid home entry move' using errcode = '22023';
  end if;

  if admin_move_home_entry.kind = 'poem' then
    perform pg_advisory_xact_lock(hashtextextended('home_featured_poems', 0));

    select ranked.rank into current_rank
    from (
      select q.poem_id as entry, (row_number() over (order by q.position, q.poem_id))::integer as rank
      from public.home_featured_poems q
    ) ranked
    where ranked.entry = admin_move_home_entry.id;

    if current_rank is null then
      return jsonb_build_object('status', 'not-found');
    end if;

    if current_rank <> admin_move_home_entry.from_position then
      return jsonb_build_object('status', 'stale');
    end if;

    select count(*)::integer into list_size from public.home_featured_poems;
    target_rank := greatest(1, least(admin_move_home_entry.to_position, list_size));

    update public.home_featured_poems fp
    set position = placed.rank
    from (
      select o.entry, (case when o.rank >= target_rank then o.rank + 1 else o.rank end)::smallint as rank
      from (
        select q.poem_id as entry, (row_number() over (order by q.position, q.poem_id))::integer as rank
        from public.home_featured_poems q
        where q.poem_id <> admin_move_home_entry.id
      ) o
      union all
      select admin_move_home_entry.id, target_rank::smallint
    ) placed
    where placed.entry = fp.poem_id and fp.position <> placed.rank;
  else
    perform pg_advisory_xact_lock(hashtextextended('home_featured_authors', 0));

    select ranked.rank into current_rank
    from (
      select q.author_id as entry, (row_number() over (order by q.position, q.author_id))::integer as rank
      from public.home_featured_authors q
    ) ranked
    where ranked.entry = admin_move_home_entry.id;

    if current_rank is null then
      return jsonb_build_object('status', 'not-found');
    end if;

    if current_rank <> admin_move_home_entry.from_position then
      return jsonb_build_object('status', 'stale');
    end if;

    select count(*)::integer into list_size from public.home_featured_authors;
    target_rank := greatest(1, least(admin_move_home_entry.to_position, list_size));

    update public.home_featured_authors fa
    set position = placed.rank
    from (
      select o.entry, (case when o.rank >= target_rank then o.rank + 1 else o.rank end)::smallint as rank
      from (
        select q.author_id as entry, (row_number() over (order by q.position, q.author_id))::integer as rank
        from public.home_featured_authors q
        where q.author_id <> admin_move_home_entry.id
      ) o
      union all
      select admin_move_home_entry.id, target_rank::smallint
    ) placed
    where placed.entry = fa.author_id and fa.position <> placed.rank;
  end if;

  return jsonb_build_object('status', 'moved');
end;
$$;

-- Removes an entry and closes the gap. A repeat, or an entry a cascade already removed, answers not-found.
create function public.admin_remove_home_entry(kind text, id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  removed_count integer;
begin
  perform public.assert_admin();

  if admin_remove_home_entry.kind is null
    or admin_remove_home_entry.kind not in ('poem', 'author')
    or admin_remove_home_entry.id is null
  then
    raise exception 'invalid home entry removal' using errcode = '22023';
  end if;

  if admin_remove_home_entry.kind = 'poem' then
    perform pg_advisory_xact_lock(hashtextextended('home_featured_poems', 0));

    delete from public.home_featured_poems fp where fp.poem_id = admin_remove_home_entry.id;
    get diagnostics removed_count = row_count;

    if removed_count = 0 then
      return jsonb_build_object('status', 'not-found');
    end if;

    perform public.compact_home_featured_poems();
  else
    perform pg_advisory_xact_lock(hashtextextended('home_featured_authors', 0));

    delete from public.home_featured_authors fa where fa.author_id = admin_remove_home_entry.id;
    get diagnostics removed_count = row_count;

    if removed_count = 0 then
      return jsonb_build_object('status', 'not-found');
    end if;

    perform public.compact_home_featured_authors();
  end if;

  return jsonb_build_object('status', 'removed');
end;
$$;

-- ---------- The admin's list (task 1.3; FR-9, FR-11) ----------

-- Both lists in position order, one row per entry. `entry_position` is the entry's rank (1 to n), the value
-- admin_move_home_entry expects as from_position (`position` itself cannot name an output column). `shown` says the poem's author or the author is public, so an
-- entry the home page skips is still listed. A poem's label is its title and author_name its author's name, read
-- inside this definer function so an author who is no longer public still has a name for the admin; an author's
-- label is their name and author_name is null. `#variable_conflict use_column` because the output columns share
-- names with table columns.
create function public.admin_list_home_entries()
returns table (
  kind text,
  id uuid,
  entry_position integer,
  shown boolean,
  label text,
  author_name text
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
    'poem'::text,
    fp.poem_id,
    (row_number() over (order by fp.position, fp.poem_id))::integer,
    public.is_public_author_profile(p.author_id),
    p.title,
    nullif(btrim(concat_ws(' ', ap.first_name, ap.last_name)), '')
  from public.home_featured_poems fp
  join public.poems p on p.id = fp.poem_id
  join public.author_profiles ap on ap.id = p.author_id
  union all
  select
    'author'::text,
    fa.author_id,
    (row_number() over (order by fa.position, fa.author_id))::integer,
    public.is_public_author_profile(fa.author_id),
    coalesce(nullif(btrim(concat_ws(' ', ap.first_name, ap.last_name)), ''), ''),
    null::text
  from public.home_featured_authors fa
  join public.author_profiles ap on ap.id = fa.author_id
  order by 1, 3;
end;
$$;

-- ---------- The public read (task 1.4; FR-2, FR-4, FR-10) ----------

-- The two ordered id lists and nothing else: the chosen poems and authors that are public, in position order.
create function public.home_featured_ids()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'poem_ids', coalesce((
      select jsonb_agg(fp.poem_id order by fp.position, fp.poem_id)
      from public.home_featured_poems fp
      join public.poems p on p.id = fp.poem_id
      where public.is_public_author_profile(p.author_id)
    ), '[]'::jsonb),
    'author_ids', coalesce((
      select jsonb_agg(fa.author_id order by fa.position, fa.author_id)
      from public.home_featured_authors fa
      where public.is_public_author_profile(fa.author_id)
    ), '[]'::jsonb)
  );
$$;

-- ---------- Grants (NFR-2) ----------
-- Supabase's default privileges grant anon on create, so each revoke is stated. The compaction bodies are
-- executable by no client role.

revoke execute on function public.compact_home_featured_poems() from public, anon, authenticated;
revoke execute on function public.compact_home_featured_authors() from public, anon, authenticated;

revoke execute on function public.admin_add_home_poem(uuid) from public, anon;
revoke execute on function public.admin_add_home_author(uuid) from public, anon;
revoke execute on function public.admin_move_home_entry(text, uuid, integer, integer) from public, anon;
revoke execute on function public.admin_remove_home_entry(text, uuid) from public, anon;
revoke execute on function public.admin_list_home_entries() from public, anon;
grant execute on function public.admin_add_home_poem(uuid) to authenticated;
grant execute on function public.admin_add_home_author(uuid) to authenticated;
grant execute on function public.admin_move_home_entry(text, uuid, integer, integer) to authenticated;
grant execute on function public.admin_remove_home_entry(text, uuid) to authenticated;
grant execute on function public.admin_list_home_entries() to authenticated;

revoke execute on function public.home_featured_ids() from public;
grant execute on function public.home_featured_ids() to anon, authenticated;
