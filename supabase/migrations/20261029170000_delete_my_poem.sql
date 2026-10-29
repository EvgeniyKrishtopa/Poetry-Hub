-- Deleting a poem, and a creation log so deleting can't reopen the create limit
-- (delete-poem, design D2; NFR-1, FR-3, FR-4, FR-9).
--
-- Follows ADR 0005: still no delete grant or policy on poems. The only way to delete a poem is
-- delete_my_poem(), a security definer function that takes the owner from auth.uid() and
-- my_author_profile_id(), so a direct API call can delete only the caller's own poems.
--
-- With deletes, counting live rows in poems no longer bounds creates: a create -> delete loop would keep the
-- count near zero. So the limit now counts poem_creations, one row per stored poem, written by a trigger on
-- poems and never touched by a delete (ADR 0010, amending ADR 0009). The table follows ADR 0007's counter
-- pattern: RLS on, no policies, no client grants; only definer functions and the trigger reach it.
--
-- Down migration (documented, never auto-run; revert the app first, its delete action calls the function):
--   drop function if exists public.delete_my_poem(uuid);
--   drop trigger if exists poems_log_creation on public.poems;
--   drop function if exists public.log_poem_creation();
--   create or replace function public.poem_create_status(profile uuid)
--   returns text language sql stable security definer set search_path = '' as $$
--     with limits (window_length, max_poems) as (values (interval '30 days', 100))
--     select case
--       when poem_create_status.profile is null
--         or not public.is_public_author_profile(poem_create_status.profile) then 'not-public'
--       when exists (
--         select 1 from limits l
--         where (
--           select count(*) from public.poems p
--           where p.author_id = poem_create_status.profile and p.created_at > now() - l.window_length
--         ) >= l.max_poems
--       ) then 'over-limit'
--       else 'allowed'
--     end;
--   $$;
--   revoke execute on function public.poem_create_status(uuid) from public, anon, authenticated;
--   drop function if exists public.poem_create_limits();
--   drop table if exists public.poem_creations;

-- ---------- The create limits ----------

-- The one home of the create limits: at most max_poems creations within any window_length (a sliding window
-- up to now, not a calendar month). Read by poem_create_status() to decide, and by the creation log to know
-- how far back it must keep rows. Internal: no client role can execute it.
create function public.poem_create_limits()
returns table (window_length interval, max_poems integer)
language sql
immutable
set search_path = ''
as $$
  values
    (interval '30 days', 100);
$$;

revoke execute on function public.poem_create_limits() from public, anon, authenticated;

-- ---------- The creation log ----------

-- One row per stored poem: who created it and when. A delete removes the poem, never its row here, so a
-- deleted poem keeps its place in the window until it ages out (FR-9). No content, only author and time.
create table public.poem_creations (
  author_id  uuid not null references public.author_profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index poem_creations_author_created_idx on public.poem_creations (author_id, created_at);

-- No policies and no grants: only the trigger and the definer functions below touch the table. Supabase
-- grants every new public table to anon and authenticated by default, so take that back.
alter table public.poem_creations enable row level security;
revoke all on public.poem_creations from anon, authenticated;

-- Logs each stored poem with its own created_at, then drops that author's rows that no window counts any
-- more, so the table stays bounded (at most max_poems rows per author inside the window, plus this one).
-- Every insert into poems passes here, create_my_poem()'s and the seed's alike. Inside create_my_poem() it
-- runs under that function's advisory lock, so two concurrent creates still can't both pass as the last one.
create function public.log_poem_creation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.poem_creations (author_id, created_at) values (new.author_id, new.created_at);

  delete from public.poem_creations c
  where c.author_id = new.author_id
    and c.created_at <= now() - (select max(l.window_length) from public.poem_create_limits() l);

  return null;
end;
$$;

revoke execute on function public.log_poem_creation() from public, anon, authenticated;

create trigger poems_log_creation
  after insert on public.poems
  for each row execute function public.log_poem_creation();

-- Poems stored before this migration still count toward their window.
insert into public.poem_creations (author_id, created_at)
select p.author_id, p.created_at
from public.poems p
where p.created_at > now() - (select max(l.window_length) from public.poem_create_limits() l);

-- Same signature, same answers, same windows; it now counts creations instead of live poems (FR-9).
create or replace function public.poem_create_status(profile uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when poem_create_status.profile is null
      or not public.is_public_author_profile(poem_create_status.profile) then 'not-public'
    when exists (
      select 1 from public.poem_create_limits() l
      where (
        select count(*) from public.poem_creations c
        where c.author_id = poem_create_status.profile
          and c.created_at > now() - l.window_length
      ) >= l.max_poems
    ) then 'over-limit'
    else 'allowed'
  end;
$$;

revoke execute on function public.poem_create_status(uuid) from public, anon, authenticated;

-- ---------- Deleting a poem ----------

-- Deletes one poem of the caller's own profile and returns
-- {"status": "deleted", "author_id": "<uuid>", "illustration_path": "<path>" | null}, or
-- {"status": "not-found"} when no such poem is the caller's: an unknown id and another author's poem answer
-- alike (FR-4). Takes no author argument: the owner comes from the session only. Not gated by public status:
-- an owner whose profile lost its last name may still remove their own poems (design D2). author_id lets the
-- app expire the right cache tag, illustration_path lets it remove the file after the row.
create function public.delete_my_poem(poem_id uuid)
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

revoke execute on function public.delete_my_poem(uuid) from public, anon;
grant execute on function public.delete_my_poem(uuid) to authenticated;
