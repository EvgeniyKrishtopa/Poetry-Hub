-- RLS, column grants, checks, and Storage policies for author_profiles (add-author-profiles, design D2).
-- implements FR-4, FR-5, FR-8, NFR-2 of add-author-profiles
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

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

reset role;

-- ---------- signed in as A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select results_eq(
  $$select first_name from public.author_profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  array['Anna'],
  'the owner reads their own non-public profile'
);

-- A real save through the grants, as the DAL does it: ensure the row, then update with the column list.
select lives_ok(
  $$insert into public.author_profiles (user_id) values ('11111111-1111-4111-8111-111111111111')
    on conflict (user_id) do nothing$$,
  'ensuring an existing row is a no-op insert'
);

select results_eq(
  $$update public.author_profiles set last_name = 'Akhmatova'
    where user_id = '11111111-1111-4111-8111-111111111111'
    returning id::text, first_name, last_name, about, about_align, photo_path$$,
  $$values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Anna'::text, 'Akhmatova'::text, null::text, 'left'::text, null::text)$$,
  'the owner updates a content field and reads it back with the explicit column list'
);

select throws_ok(
  $$insert into public.author_profiles (user_id, first_name) values ('11111111-1111-4111-8111-111111111111', 'Second')$$,
  '23505', null,
  'a second profile for the same user violates the unique constraint'
);

select throws_ok(
  $$update public.author_profiles set id = gen_random_uuid() where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null,
  'the owner cannot update id'
);

select throws_ok(
  $$update public.author_profiles set user_id = '33333333-3333-4333-8333-333333333333'
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null,
  'the owner cannot update user_id'
);

select throws_ok(
  $$update public.author_profiles set created_at = now() where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null,
  'the owner cannot update created_at'
);

select throws_ok(
  $$insert into public.author_profiles (user_id, first_name) values ('33333333-3333-4333-8333-333333333333', 'Mallory')$$,
  '42501', null,
  'a user cannot insert a profile for someone else'
);

-- Photo path checks.
select lives_ok(
  $$update public.author_profiles
    set photo_path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/dddddddd-dddd-4ddd-8ddd-dddddddddddd.png'
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'a photo path inside the own folder is accepted'
);

select throws_ok(
  $$update public.author_profiles
    set photo_path = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg'
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a photo path in another profile''s folder is rejected'
);

select throws_ok(
  $$update public.author_profiles
    set photo_path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/../bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg'
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a photo path escaping the folder with dot segments is rejected'
);

select throws_ok(
  $$update public.author_profiles
    set photo_path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/portrait.jpg'
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a photo file name that is not a uuid is rejected'
);

-- Content checks.
select throws_ok(
  $$update public.author_profiles set first_name = '' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'an empty name is rejected'
);

select throws_ok(
  $$update public.author_profiles set first_name = '   ' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a whitespace-only name is rejected'
);

-- Blank means what the app's trim() removes, not only U+0020: tab, newline, NBSP, ideographic space, BOM.
select throws_ok(
  $$update public.author_profiles set first_name = E'\t' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a tab-only first name is rejected'
);

select throws_ok(
  $$update public.author_profiles set last_name = E'\n \r' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a newline-and-space last name is rejected'
);

select throws_ok(
  $$update public.author_profiles set first_name = E'\u00A0\u3000' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a first name of a no-break space and an ideographic space is rejected'
);

select throws_ok(
  $$update public.author_profiles set last_name = E'\uFEFF' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a last name of a byte order mark is rejected'
);

select throws_ok(
  $$update public.author_profiles set about = E'\n\t\n' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'an about of newlines and tabs is rejected'
);

select lives_ok(
  $$update public.author_profiles set first_name = E'\tAnna\n' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'a name with surrounding whitespace and real content is accepted'
);

select lives_ok(
  $$update public.author_profiles set first_name = 'Anna' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'restore the first name for the cases below'
);

select throws_ok(
  $$update public.author_profiles set last_name = repeat('я', 61) where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a 61-character name is rejected'
);

select lives_ok(
  $$update public.author_profiles set last_name = repeat('я', 60) where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'a 60-character name is accepted'
);

select throws_ok(
  $$update public.author_profiles set about = repeat('a', 1001) where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a 1001-character about is rejected'
);

select throws_ok(
  $$update public.author_profiles set about = '  ' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'a whitespace-only about is rejected'
);

select throws_ok(
  $$update public.author_profiles set about_align = 'justify' where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'an unknown alignment is rejected'
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

-- A's row was made public above (both names); make the check about a row B cannot see by owner rules.
reset role;
update public.author_profiles set last_name = null where user_id = '11111111-1111-4111-8111-111111111111';
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
