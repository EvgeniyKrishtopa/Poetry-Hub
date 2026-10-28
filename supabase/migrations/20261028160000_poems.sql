-- Poems: author-owned rows stored only through create_my_poem(), and the public illustrations bucket
-- (add-poem-creation, design D2; NFR-1, FR-5, FR-6).
--
-- Follows ADR 0005: RLS decides which rows a caller sees, column grants decide which columns, and no client
-- role has an insert, update, or delete grant. The only write path is create_my_poem(), a security definer
-- function that resolves the caller from auth.uid(), stores the poem for the caller's own public profile,
-- and enforces the creation limit by counting the author's own rows. A direct API call can't skip that
-- check, because there is no other way to store a poem (design D2, ADR 0009 to be recorded in task 8.1).
--
-- The public-profile rule ("first and last name are set") moves into is_public_author_profile(), and the
-- author_profiles public policy is rewritten to call it, so an author page and its poems can never
-- disagree.
--
-- Down migration (documented, never auto-run; revert the app first, its reads fail without the table):
--   drop policy if exists "public profiles are readable by anyone" on public.author_profiles;
--   create policy "public profiles are readable by anyone" on public.author_profiles
--     for select to anon, authenticated
--     using (first_name is not null and last_name is not null);
--   drop policy if exists "authors upload poem illustrations" on storage.objects;
--   drop policy if exists "owners read their poem illustrations" on storage.objects;
--   drop policy if exists "owners delete poem illustrations" on storage.objects;
--   -- Storage refuses direct deletes from its tables unless this is set for the transaction.
--   set local storage.allow_delete_query = 'true';
--   delete from storage.objects where bucket_id = 'poem-illustrations';
--   delete from storage.buckets where id = 'poem-illustrations';
--   drop function if exists public.can_create_poem();
--   drop function if exists public.create_my_poem(text, text, text, text);
--   drop function if exists public.poem_create_status(uuid);
--   drop table if exists public.poems;
--   drop function if exists public.owns_public_author_folder(text);
--   drop function if exists public.is_public_author_profile(uuid);

-- ---------- The public-profile rule ----------

-- Whether a profile is public: both names set. Runs as the table owner, so a policy on author_profiles can
-- call it without recursing into its own RLS. Executable by everyone: it reveals only what the public
-- policy already shows.
create function public.is_public_author_profile(profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.author_profiles p
    where p.id = is_public_author_profile.profile
      and p.first_name is not null
      and p.last_name is not null
  );
$$;

revoke execute on function public.is_public_author_profile(uuid) from public;
grant execute on function public.is_public_author_profile(uuid) to anon, authenticated;

-- Same rule, new home: the expression moves into the function above.
drop policy "public profiles are readable by anyone" on public.author_profiles;
create policy "public profiles are readable by anyone" on public.author_profiles
  for select to anon, authenticated
  using (public.is_public_author_profile(id));

-- Whether the caller owns a public profile a storage folder is named after; the illustration upload policy
-- below. Takes text and compares p.id::text, like owns_author_profile(), so a malformed folder name returns
-- false instead of failing a uuid cast.
create function public.owns_public_author_folder(folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.author_profiles p
    where p.id::text = owns_public_author_folder.folder
      and p.user_id = (select auth.uid())
      and public.is_public_author_profile(p.id)
  );
$$;

revoke execute on function public.owns_public_author_folder(text) from public, anon;
grant execute on function public.owns_public_author_folder(text) to authenticated;

-- ---------- The poems table ----------

create table public.poems (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid not null references public.author_profiles (id) on delete cascade,
  -- Blank means what the app's trim() removes, the same explicit class as author_profiles (see that
  -- migration for why not btrim or [[:space:]]). char_length counts code points, like the form's
  -- trimmedLength. The genre id is a Contentful entry's sys.id; null means no genre.
  title             text not null check (char_length(title) <= 80 and title !~ E'^[\t\n\u000B\f\r \u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*$'),
  text              text not null check (char_length(text) <= 10000 and text !~ E'^[\t\n\u000B\f\r \u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*$'),
  genre_id          text check (genre_id is null or genre_id ~ '^[A-Za-z0-9._-]{1,64}$'),
  illustration_path text,
  created_at        timestamptz not null default now(),
  -- The whole format, not just the first segment: `<id>/../<other id>/…` would pass a prefix check.
  constraint poems_illustration_in_own_folder check (
    illustration_path is null
    or illustration_path ~ ('^' || author_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$')
  )
);

-- One author's list, newest first; also the limit counts in poem_create_status().
create index poems_author_created_idx on public.poems (author_id, created_at desc, id);

alter table public.poems enable row level security;

create policy "poems of public authors are readable by anyone" on public.poems
  for select to anon, authenticated
  using (public.is_public_author_profile(author_id));

-- No insert, update, or delete policy or grant: a poem is stored only by create_my_poem(), and nobody
-- changes or deletes one (proposal, Out of Scope). Supabase grants every new public table to anon and
-- authenticated by default, so start from nothing.
revoke all on public.poems from anon, authenticated;
grant select (id, author_id, title, text, genre_id, illustration_path, created_at) on public.poems to anon, authenticated;

-- ---------- Creating a poem ----------

-- The one home of the creation rules (design D2): 'not-public' for no profile or a non-public one,
-- 'over-limit' when the author already has 2 poems in the last minute or 20 in the last 24 hours (sliding
-- windows over created_at), otherwise 'allowed'. Internal: no client role can execute it.
create function public.poem_create_status(profile uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with limits (window_length, max_poems) as (
    values
      (interval '1 minute', 2),
      (interval '1 day', 20)
  )
  select case
    when poem_create_status.profile is null
      or not public.is_public_author_profile(poem_create_status.profile) then 'not-public'
    when exists (
      select 1 from limits l
      where (
        select count(*) from public.poems p
        where p.author_id = poem_create_status.profile
          and p.created_at > now() - l.window_length
      ) >= l.max_poems
    ) then 'over-limit'
    else 'allowed'
  end;
$$;

revoke execute on function public.poem_create_status(uuid) from public, anon, authenticated;

-- Stores one poem for the caller's own public profile and returns {"status": "created", "id": "<uuid>"},
-- or {"status": "not-public" | "over-limit"} with nothing stored. The table checks reject a blank or
-- over-long title or text, a malformed genre id, and an illustration path outside the author's folder
-- (23514). Arguments are always written create_my_poem.<name>: in plpgsql a bare `title` next to the
-- `title` column is ambiguous.
create function public.create_my_poem(title text, text text, genre_id text, illustration_path text)
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

-- The app's check before any upload (design D7): {"status": "allowed" | "not-public" | "over-limit"}.
-- Writes nothing, so calling it directly gains a caller nothing.
create function public.can_create_poem()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return jsonb_build_object('status', public.poem_create_status(public.my_author_profile_id()));
end;
$$;

revoke execute on function public.create_my_poem(text, text, text, text) from public, anon;
revoke execute on function public.can_create_poem() from public, anon;
grant execute on function public.create_my_poem(text, text, text, text) to authenticated;
grant execute on function public.can_create_poem() to authenticated;

-- ---------- The illustrations bucket ----------

-- Public reads by URL; writes limited by size and type here and by the policies below. Mirrored in
-- supabase/config.toml for the local stack.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('poem-illustrations', 'poem-illustrations', true, 5242880, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Uploads only into the folder of the caller's own public profile, with the illustration_path name format
-- `<uuid>/<uuid>.png|jpg`, so the public bucket can't host arbitrary objects.
create policy "authors upload poem illustrations" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'poem-illustrations'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
    and public.owns_public_author_folder((storage.foldername(name))[1])
  );

-- The best-effort cleanup after a failed create uses `remove`, which reads the object before deleting it,
-- so owners need select as well as delete on their own folder. Public reads need no policy.
create policy "owners read their poem illustrations" on storage.objects
  for select to authenticated
  using (bucket_id = 'poem-illustrations' and public.owns_author_profile((storage.foldername(name))[1]));

create policy "owners delete poem illustrations" on storage.objects
  for delete to authenticated
  using (bucket_id = 'poem-illustrations' and public.owns_author_profile((storage.foldername(name))[1]));
