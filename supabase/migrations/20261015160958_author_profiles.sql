-- Author profiles: one owner-scoped row per user, and the public photo bucket (add-author-profiles, design D2).
--
-- RLS decides which rows a caller can touch; the column grants decide which columns. Together they hold
-- the profile rules even when the app is bypassed and PostgREST or Storage is called directly with the
-- publishable key (FR-4, FR-5, NFR-2). The auth user id never leaves the database: no client role can
-- select or write user_id, and the three security definer functions below are the only way to reach
-- "my profile" (code-review CR-01, 2026-10-15).
--
-- Down migration (documented, never auto-run):
--   drop policy if exists "owners upload author photos" on storage.objects;
--   drop policy if exists "owners read their author photos" on storage.objects;
--   drop policy if exists "owners delete author photos" on storage.objects;
--   delete from storage.objects where bucket_id = 'author-photos';
--   delete from storage.buckets where id = 'author-photos';
--   drop function if exists public.owns_author_profile(text);
--   drop function if exists public.my_author_profile_id();
--   drop function if exists public.ensure_my_author_profile();
--   drop table if exists public.author_profiles;

create table public.author_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  -- A whitespace-only value written straight through PostgREST must not count as content (FR-4). Blank
  -- means what the app's trim() removes: one-argument btrim strips only U+0020, and [[:space:]] covers
  -- tab, newlines, NBSP and U+3000 but not the BOM, hence the explicit \uFEFF.
  -- char_length counts code points, the same measure as the app's validation (design D2).
  first_name  text check (first_name is null or (char_length(first_name) <= 60 and first_name !~ E'^[[:space:]\uFEFF]*$')),
  last_name   text check (last_name  is null or (char_length(last_name)  <= 60 and last_name  !~ E'^[[:space:]\uFEFF]*$')),
  about       text check (about      is null or (char_length(about) <= 1000 and about !~ E'^[[:space:]\uFEFF]*$')),
  about_align text not null default 'left' check (about_align in ('left', 'center', 'right')),
  photo_path  text,
  created_at  timestamptz not null default now(),
  -- A table check, because it reads `id`. It pins the whole format, not just the first segment:
  -- `<id>/../<other id>/…` would pass a prefix check and resolve to another author's file (Gate 1 N2).
  constraint author_profiles_photo_path_in_own_folder check (
    photo_path is null
    or photo_path ~ ('^' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$')
  )
);

alter table public.author_profiles enable row level security;

create policy "public profiles are readable by anyone" on public.author_profiles
  for select to anon, authenticated
  using (first_name is not null and last_name is not null);

create policy "owners read their own profile" on public.author_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "owners update their own profile" on public.author_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No insert policy: a row is created only by ensure_my_author_profile() below. No delete policy: the app
-- clears fields and never deletes the row (proposal, Out of Scope).

-- Column privileges (Gate 1 C3, P5; CR-01). Supabase grants every new public table to anon and
-- authenticated by default, so start from nothing. Neither role can select user_id (the policies above
-- still compare it: a policy needs no column privilege) or write id, user_id, or created_at; there is no
-- insert grant at all.
revoke all on public.author_profiles from anon, authenticated;
grant select (id, first_name, last_name, about, about_align, photo_path) on public.author_profiles to anon, authenticated;
grant update (first_name, last_name, about, about_align, photo_path) on public.author_profiles to authenticated;

-- "My profile" without exposing user_id. Each runs as the table owner with an empty search_path, takes no
-- user id argument, and resolves the caller from auth.uid() only. Executable by authenticated alone.

-- Creates the caller's row if it doesn't exist yet and returns its id: the first step of every field
-- write (design D3).
create function public.ensure_my_author_profile()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  profile_id uuid;
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  insert into public.author_profiles (user_id) values (caller) on conflict (user_id) do nothing;
  select p.id into profile_id from public.author_profiles p where p.user_id = caller;
  return profile_id;
end;
$$;

-- The caller's profile id, or null when they have none: the owner read (design D3).
create function public.my_author_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.author_profiles p where p.user_id = (select auth.uid());
$$;

-- Whether the caller owns the profile a storage folder is named after; used by the policies below.
create function public.owns_author_profile(folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.author_profiles p
    where p.id::text = folder and p.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.ensure_my_author_profile() from public, anon;
revoke execute on function public.my_author_profile_id() from public, anon;
revoke execute on function public.owns_author_profile(text) from public, anon;
grant execute on function public.ensure_my_author_profile() to authenticated;
grant execute on function public.my_author_profile_id() to authenticated;
grant execute on function public.owns_author_profile(text) to authenticated;

-- The photo bucket: public reads by URL; writes limited by size and type here and by the policies below.
-- Mirrored in supabase/config.toml for the local stack.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('author-photos', 'author-photos', true, 5242880, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Each policy allows only a folder named after a profile the caller owns.
-- Uploads also pin the whole name to the photo_path format `<uuid>/<uuid>.png|jpg`, so the public bucket
-- can't host arbitrary objects (any name, subfolders, dot segments) that no profile references.
create policy "owners upload author photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'author-photos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
    and public.owns_author_profile((storage.foldername(name))[1])
  );

-- `remove` reads the object before deleting it, so owners also need select on their own folder. Public
-- reads go through the public-bucket URL and need no policy.
create policy "owners read their author photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'author-photos' and public.owns_author_profile((storage.foldername(name))[1]));

create policy "owners delete author photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'author-photos' and public.owns_author_profile((storage.foldername(name))[1]));
