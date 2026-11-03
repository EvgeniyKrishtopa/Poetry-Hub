-- Updating a poem, and the poem_edit write limit (edit-poem, design D2; NFR-1, FR-4, FR-6, FR-7, FR-10).
--
-- Follows ADR 0005: still no update grant or policy on poems. The only way to change a poem is
-- update_my_poem(), a security definer function that takes the owner from auth.uid() and
-- my_author_profile_id(), and sets only the title, text, genre, and illustration. So a direct API call can
-- change only the caller's own poem, never its id, author, or creation time.
--
-- The edit limit is a new scope of ADR 0007's per-user counter, checked by the app before any upload, as for
-- the profile writes: what it protects is the upload and the cache expiry, which only the app does.
--
-- Down migration (documented, never auto-run; revert the app first, its edit action calls both functions):
--   drop function if exists public.update_my_poem(uuid, text, text, text, boolean, text);
--   delete from public.write_rate_limits where scope = 'poem_edit';
--   alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
--   alter table public.write_rate_limits add constraint write_rate_limits_scope_check
--     check (scope in ('profile_write', 'photo_upload'));
--   then re-run the `create or replace function public.consume_write_allowance` statement below without
--   the ('poem_edit', 10, interval '1 minute') row.

-- ---------- The edit limit ----------

alter table public.write_rate_limits drop constraint write_rate_limits_scope_check;
alter table public.write_rate_limits add constraint write_rate_limits_scope_check
  check (scope in ('profile_write', 'photo_upload', 'poem_edit'));

-- Same body as in 20261017093000_write_rate_limits.sql, with poem_edit added to the limits:
--   profile_write: 10 per 1 minute; photo_upload: 5 per 1 hour; poem_edit: 10 per 1 minute.
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
      ('poem_edit', 10, interval '1 minute')
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

-- ---------- Updating a poem ----------

-- Changes one poem of the caller's own public profile and returns
-- {"status": "updated", "author_id": "<uuid>", "replaced_path": "<path>" | null}, or {"status": "not-found"}
-- with nothing changed when no such poem is the caller's: another author's poem, an unknown id, and a
-- non-public own profile answer alike (FR-10). Takes no author argument: the owner comes from the session only.
--
-- keep_illustration = true leaves the stored illustration as is and ignores illustration_path; false sets it
-- to illustration_path, a new path (replace) or null (remove). A null keep_illustration raises (22004)
-- rather than reading as a removal, so a call that omits it can't drop an illustration by accident. The table's check rejects a path outside the
-- author's own folder (23514), as for a create. replaced_path is the old path when the illustration changed
-- and there was one, so the app removes that file once the row no longer points at it. The old path is read
-- `for update`, so two concurrent saves can't both see it as theirs to remove.
--
-- Arguments are always written update_my_poem.<name>: in plpgsql a bare `title` next to the `title` column
-- is ambiguous.
create function public.update_my_poem(
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

revoke execute on function public.update_my_poem(uuid, text, text, text, boolean, text) from public, anon;
grant execute on function public.update_my_poem(uuid, text, text, text, boolean, text) to authenticated;
