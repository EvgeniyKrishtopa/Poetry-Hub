-- Public collections: anyone reads a public author's non-empty collections and which collection a poem is in
-- (public-collections, design D2; NFR-1, FR-1).
--
-- Reverses the privacy of ADR 0011 (collections) and ADR 0012 (poems.collection_id) for public authors; ADR
-- 0013 records it. Only managing collections stays private: no client role gains an insert, update, or delete
-- grant, and the write functions keep taking the owner from auth.uid() and my_author_profile_id().
--
-- A collection is visible to anon and authenticated when its author's profile is public and at least one poem
-- is in it. The owner policy from 20261104180000_collections.sql stays, so an author still reads their own
-- empty collections and their collections while their profile isn't public; Postgres ORs the two policies.
-- The `exists` subquery runs under the caller's own RLS on poems (public authors' poems only) and needs the
-- collection_id grant below. poems' policy never reads collections, so there is no policy recursion.
--
-- delete_my_collection() also returns the deleted row's author_id, as delete_my_poem() does: the app expires
-- the author's public cache tag with it, whatever the profile's status.
--
-- Down migration (documented, never auto-run; revert the app first, its public pages read both tables):
--   drop policy "anyone reads public authors' non-empty collections" on public.collections;
--   revoke select on public.collections from anon;
--   revoke select (collection_id) on public.poems from anon, authenticated;
--   then re-run the `create function public.delete_my_collection` statement from
--   20261104180000_collections.sql as `create or replace` (the extra key is harmless to an older app, so the
--   order of app and database rollback doesn't matter).

-- ---------- Reading ----------

-- `to anon, authenticated`: a signed-in reader is not the owner of someone else's collection, and the owner
-- policy covers only own rows.
create policy "anyone reads public authors' non-empty collections" on public.collections
  for select to anon, authenticated
  using (
    public.is_public_author_profile(author_id)
    and exists (select 1 from public.poems p where p.collection_id = collections.id)
  );

-- authenticated already holds this grant (20261104180000_collections.sql).
grant select (id, author_id, title, description, created_at) on public.collections to anon;

-- The one column of poems nobody could read until now. The rows stay public authors' only (poems' policy), so
-- a non-public author's membership stays hidden. Writes stay closed: no update grant on any column.
grant select (collection_id) on public.poems to anon, authenticated;

-- ---------- Deleting ----------

-- Same signature and rules as in 20261104180000_collections.sql, plus author_id on 'deleted':
-- {"status": "deleted", "title": "<title>", "author_id": "<uuid>"}. 'not-found' is unchanged. `create or
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
  deleted_title text;
  deleted_author uuid;
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  delete from public.collections c
  where c.id = delete_my_collection.collection_id
    and c.author_id = public.my_author_profile_id()
  returning c.title, c.author_id into deleted_title, deleted_author;

  if deleted_title is null then
    return jsonb_build_object('status', 'not-found');
  end if;

  return jsonb_build_object('status', 'deleted', 'title', deleted_title, 'author_id', deleted_author);
end;
$$;
