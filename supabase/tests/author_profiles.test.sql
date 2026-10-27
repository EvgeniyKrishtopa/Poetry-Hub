-- RLS, column grants, checks, and Storage policies for author_profiles (add-author-profiles, design D2).
-- implements FR-4, FR-5, FR-8, NFR-2 of add-author-profiles
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(56);

-- Start from an empty table, so the visibility checks below see only these fixtures and not the local seed
-- (supabase/seed.sql). The whole file runs in one transaction that is rolled back, so the seed survives.
delete from public.author_profiles;

-- Fixtures, written as the superuser (bypasses RLS). A owns a non-public profile, B a public one.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'c@example.test');

insert into public.author_profiles (id, user_id, first_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Anna');
insert into public.author_profiles (id, user_id, first_name, last_name, photo_path) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Boris', 'Pasternak',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg');

insert into storage.objects (bucket_id, name) values
  ('author-photos', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg');

-- implements FR-4 of refine-author-page-and-contact
select hasnt_column('public', 'author_profiles', 'about_align', 'author_profiles has no about_align column');

-- ---------- anon ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  'select id::text from public.author_profiles order by id',
  array['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
  'anon sees only public profiles'
);

select throws_ok(
  'select user_id from public.author_profiles',
  '42501', null,
  'anon cannot select user_id'
);

select throws_ok(
  'select public.ensure_my_author_profile()',
  '42501', null,
  'anon cannot call ensure_my_author_profile()'
);

reset role;

-- ---------- signed in as A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select results_eq(
  $$select first_name from public.author_profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  array['Anna'],
  'the owner reads their own non-public profile'
);

select throws_ok(
  'select user_id from public.author_profiles',
  '42501', null,
  'a signed-in user cannot select user_id, not even their own'
);

select is(
  public.my_author_profile_id(),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'my_author_profile_id() returns the caller''s profile id'
);

-- A real save, as the DAL does it: ensure the row, then update by id with the column list.
select is(
  public.ensure_my_author_profile(),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'ensure_my_author_profile() returns the existing profile id'
);

select results_eq(
  $$update public.author_profiles set last_name = 'Akhmatova'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    returning id::text, first_name, last_name, about, photo_path$$,
  $$values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Anna'::text, 'Akhmatova'::text, null::text, null::text)$$,
  'the owner updates a content field and reads it back with the explicit column list'
);

select throws_ok(
  $$insert into public.author_profiles (first_name) values ('Second')$$,
  '42501', null,
  'a direct insert is denied: profiles are created only by ensure_my_author_profile()'
);

select throws_ok(
  $$update public.author_profiles set id = gen_random_uuid() where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null,
  'the owner cannot update id'
);

select throws_ok(
  $$update public.author_profiles set user_id = '33333333-3333-4333-8333-333333333333'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null,
  'the owner cannot update user_id'
);

select throws_ok(
  $$update public.author_profiles set created_at = now() where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null,
  'the owner cannot update created_at'
);

select throws_ok(
  $$insert into public.author_profiles (user_id, first_name) values ('33333333-3333-4333-8333-333333333333', 'Mallory')$$,
  '42501', null,
  'a user cannot insert a profile for someone else'
);

-- ---------- signed in as C, who has no profile yet ----------
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);

select is(public.my_author_profile_id(), null::uuid, 'my_author_profile_id() is null without a profile');

select isnt(public.ensure_my_author_profile(), null::uuid, 'ensure_my_author_profile() creates the caller''s row');

select is(
  public.ensure_my_author_profile(),
  public.my_author_profile_id(),
  'a second ensure_my_author_profile() returns the same row'
);

reset role;

select results_eq(
  $$select count(*)::int from public.author_profiles where user_id = '33333333-3333-4333-8333-333333333333'$$,
  array[1],
  'the created row belongs to the caller, and only one exists'
);

-- Back to A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

-- Photo path checks.
select lives_ok(
  $$update public.author_profiles
    set photo_path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/dddddddd-dddd-4ddd-8ddd-dddddddddddd.png'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a photo path inside the own folder is accepted'
);

select throws_ok(
  $$update public.author_profiles
    set photo_path = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a photo path in another profile''s folder is rejected'
);

select throws_ok(
  $$update public.author_profiles
    set photo_path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/../bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a photo path escaping the folder with dot segments is rejected'
);

select throws_ok(
  $$update public.author_profiles
    set photo_path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/portrait.jpg'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a photo file name that is not a uuid is rejected'
);

select throws_ok(
  $$update public.author_profiles
    set photo_path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/------------------------------------.png'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a 36-character file name that is not in uuid form is rejected'
);

-- Content checks.
select throws_ok(
  $$update public.author_profiles set first_name = '' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'an empty name is rejected'
);

select throws_ok(
  $$update public.author_profiles set first_name = '   ' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a whitespace-only name is rejected'
);

-- Blank means what the app's trim() removes, not only U+0020: tab, newline, NBSP, ideographic space, BOM.
select throws_ok(
  $$update public.author_profiles set first_name = E'\t' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a tab-only first name is rejected'
);

select throws_ok(
  $$update public.author_profiles set last_name = E'\n \r' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a newline-and-space last name is rejected'
);

select throws_ok(
  $$update public.author_profiles set first_name = E'\u00A0\u3000' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a first name of a no-break space and an ideographic space is rejected'
);

select throws_ok(
  $$update public.author_profiles set last_name = E'\uFEFF' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a last name of a byte order mark is rejected'
);

select throws_ok(
  $$update public.author_profiles set about = E'\n\t\n' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'an about of newlines and tabs is rejected'
);

select lives_ok(
  $$update public.author_profiles set first_name = E'\tAnna\n' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a name with surrounding whitespace and real content is accepted'
);

select throws_ok(
  $$update public.author_profiles set first_name = chr(8195) where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'an em space (U+2003) first name is rejected'
);

-- trim() keeps U+0085 (NEL), so the database counts it as content as well; the two layers agree.
select lives_ok(
  $$update public.author_profiles set first_name = chr(133) where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a NEL (U+0085) first name is content, as it is for trim()'
);

select lives_ok(
  $$update public.author_profiles set first_name = 'Anna' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'restore the first name for the cases below'
);

select throws_ok(
  $$update public.author_profiles set last_name = repeat('я', 61) where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a 61-character name is rejected'
);

select lives_ok(
  $$update public.author_profiles set last_name = repeat('я', 60) where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a 60-character name is accepted'
);

select throws_ok(
  $$update public.author_profiles set about = repeat('a', 1001) where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a 1001-character about is rejected'
);

select throws_ok(
  $$update public.author_profiles set about = '  ' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514', null,
  'a whitespace-only about is rejected'
);

-- Storage, as A.
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('author-photos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg')$$,
  'the owner uploads into their own profile folder'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('author-photos', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/ffffffff-ffff-4fff-8fff-ffffffffffff.jpg')$$,
  '42501', null,
  'a user cannot upload into another profile''s folder'
);

-- Uploads follow the same name format as photo_path, so the public bucket holds only profile photos.
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('author-photos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/page.html')$$,
  '42501', null,
  'an upload whose file name is not <uuid>.png|jpg is rejected'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('author-photos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/../bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/ffffffff-ffff-4fff-8fff-ffffffffffff.png')$$,
  '42501', null,
  'an upload path with dot segments is rejected'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('author-photos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sub/ffffffff-ffff-4fff-8fff-ffffffffffff.png')$$,
  '42501', null,
  'an upload into a subfolder is rejected'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('author-photos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/------------------------------------.png')$$,
  '42501', null,
  'an upload whose 36-character name is not in uuid form is rejected'
);

select isnt_empty(
  $$select name from storage.objects
    where bucket_id = 'author-photos'
      and name = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg'$$,
  'the owner sees the files in their own folder'
);

select is_empty(
  $$select name from storage.objects
    where bucket_id = 'author-photos'
      and name like 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/%'$$,
  'a user does not see files in another profile''s folder'
);

-- Direct deletes are blocked by Storage's own guard unless this is set; we test the policy, not the guard.
select set_config('storage.allow_delete_query', 'true', true);

-- A delete only reaches rows the select policy shows, so the cross-folder case below is guarded by both
-- policies; this positive case is what proves the delete policy itself exists.
select isnt_empty(
  $$delete from storage.objects
    where bucket_id = 'author-photos'
      and name = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg'
    returning name$$,
  'the owner deletes a file in their own folder'
);

select is_empty(
  $$delete from storage.objects
    where bucket_id = 'author-photos'
      and name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg'
    returning name$$,
  'a user cannot delete a file in another profile''s folder'
);

reset role;

select isnt_empty(
  $$select 1 from storage.objects
    where bucket_id = 'author-photos'
      and name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg'$$,
  'the other profile''s file is still there'
);

-- ---------- signed in as B: someone else's non-public row ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

-- A's row is public at this point (both names set above).
select results_eq(
  $$select first_name from public.author_profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  array['Anna'],
  'a signed-in user reads another user''s public profile'
);

-- Storage in the test plan's direction: B against A's folder.
reset role;
insert into storage.objects (bucket_id, name) values
  ('author-photos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/99999999-9999-4999-8999-999999999999.png');
set local role authenticated;

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('author-photos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/88888888-8888-4888-8888-888888888888.png')$$,
  '42501', null,
  'B cannot upload into A''s folder'
);

-- Make A's file visible to B for this one check, so the delete is refused by the delete policy itself
-- and not only because the select policy hides the row. Rolled back with the rest of the file.
reset role;
create policy "test only: every author photo is visible" on storage.objects
  for select to authenticated using (bucket_id = 'author-photos');
set local role authenticated;

select isnt_empty(
  $$select name from storage.objects
    where name = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/99999999-9999-4999-8999-999999999999.png'$$,
  'with the test-only policy, B sees A''s file'
);

select is_empty(
  $$delete from storage.objects
    where bucket_id = 'author-photos'
      and name = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/99999999-9999-4999-8999-999999999999.png'
    returning name$$,
  'the delete policy alone stops B deleting a file in A''s folder'
);

reset role;
drop policy "test only: every author photo is visible" on storage.objects;

-- Now make the check about a row B cannot see by owner rules.
update public.author_profiles set last_name = null where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role authenticated;

select is_empty(
  $$select id from public.author_profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a user cannot read another user''s non-public profile'
);

select is_empty(
  $$update public.author_profiles set first_name = 'Hacked'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning id$$,
  'a user cannot update another user''s profile'
);

reset role;

select results_eq(
  $$select first_name from public.author_profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  array['Anna'],
  'the other user''s profile is unchanged'
);

select * from finish();
rollback;
