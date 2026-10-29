-- RLS, grants, checks, the create function and its limit, and Storage policies for poems
-- (add-poem-creation, design D2, D13), and the delete function and the creation log (delete-poem, design D2, D9).
-- implements NFR-1 and FR-6 of add-poem-creation
-- implements NFR-1 and FR-9 of delete-poem
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(79);

-- Start from empty tables, so the checks below see only these fixtures and not the local seed. The whole
-- file runs in one transaction that is rolled back, so the seed survives.
delete from public.poems;
delete from public.author_profiles;

-- Fixtures, written as the superuser (bypasses RLS). A owns a non-public profile, B and D public ones, C has
-- no profile. The two old poems are two days old: B's counts toward its 30-day window.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'c@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'd@example.test');

insert into public.author_profiles (id, user_id, first_name, last_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Anna', null),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Boris', 'Pasternak'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', 'Daniil', 'Kharms');

insert into public.poems (id, author_id, title, text, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Hidden', 'Not public yet', now() - interval '2 days'),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Old', 'An old poem', now() - interval '2 days');

-- D already has 100 poems in the last 30 days, 6 hours apart (the oldest 25 days ago, one of a kind).
insert into public.poems (author_id, title, text, created_at)
select 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Poem ' || n, 'Text', now() - n * interval '6 hours'
from generate_series(1, 100) as s (n);

select results_eq(
  $$select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'poem-illustrations'$$,
  $$values (true, 5242880::bigint, array['image/png', 'image/jpeg'])$$,
  'the illustrations bucket is public, 5 MB, PNG and JPEG only'
);

-- ---------- anon ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  $$select id::text from public.poems
    where author_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  array['b0000000-0000-4000-8000-000000000001'],
  'anon sees only poems of public profiles'
);

select results_eq(
  'select id::text from public.author_profiles order by id',
  array['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'],
  'anon still sees only public profiles, now through is_public_author_profile()'
);

select throws_ok(
  $$insert into public.poems (author_id, title, text) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'T', 'X')$$,
  '42501', null,
  'anon cannot insert a poem directly'
);

select throws_ok($$update public.poems set title = 'Hacked'$$, '42501', null, 'anon cannot update poems');

select throws_ok($$delete from public.poems$$, '42501', null, 'anon cannot delete poems');

select throws_ok(
  $$select public.create_my_poem('T', 'X', null, null)$$,
  '42501', null,
  'anon cannot call create_my_poem()'
);

select throws_ok($$select public.can_create_poem()$$, '42501', null, 'anon cannot call can_create_poem()');

select throws_ok(
  $$select public.poem_create_status('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', null,
  'anon cannot call poem_create_status()'
);

select throws_ok(
  $$select public.delete_my_poem('b0000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'anon cannot call delete_my_poem()'
);

select throws_ok($$select * from public.poem_creations$$, '42501', null, 'anon cannot read the creation log');

select throws_ok(
  $$insert into public.poem_creations (author_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', null,
  'anon cannot write the creation log'
);

reset role;

-- An authenticated role whose token carries no user id: the function's own guard, not the grant, stops it.
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

select throws_ok(
  $$select public.delete_my_poem('b0000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'delete_my_poem() rejects a signed-in role without a user id'
);

reset role;

-- ---------- signed in as B (public profile) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.poems (author_id, title, text) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'T', 'X')$$,
  '42501', null,
  'the owner cannot insert a poem directly for their own profile'
);

select throws_ok(
  $$insert into public.poems (author_id, title, text) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'T', 'X')$$,
  '42501', null,
  'a user cannot insert a poem directly for another profile'
);

select throws_ok(
  $$update public.poems set title = 'Hacked' where id = 'b0000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'the owner cannot update their poem'
);

select throws_ok(
  $$update public.poems set created_at = now() where id = 'b0000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'the owner cannot change a poem''s creation time'
);

select throws_ok(
  $$delete from public.poems where id = 'b0000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'the owner cannot delete their poem'
);

select throws_ok(
  $$select public.poem_create_status('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', null,
  'a signed-in user cannot call poem_create_status()'
);

-- Each rejected create below fails as a whole statement, so it stores nothing and counts in no window.
select throws_ok(
  $$select public.create_my_poem(' ' || chr(9) || chr(160) || chr(12288), 'X', null, null)$$,
  '23514', null,
  'a title of a space, a tab, a no-break space, and an ideographic space is rejected as blank'
);

select throws_ok(
  $$select public.create_my_poem(repeat('я', 81), 'X', null, null)$$,
  '23514', null,
  'an 81-character title is rejected'
);

select throws_ok(
  $$select public.create_my_poem('T', E'\n\n  ', null, null)$$,
  '23514', null,
  'a blank text is rejected'
);

select throws_ok(
  $$select public.create_my_poem('T', repeat('я', 10001), null, null)$$,
  '23514', null,
  'a 10001-character text is rejected'
);

select throws_ok(
  $$select public.create_my_poem('T', 'X', 'not a genre/id', null)$$,
  '23514', null,
  'a malformed genre id is rejected'
);

select throws_ok(
  $$select public.create_my_poem('T', 'X', 'g', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.png')$$,
  '23514', null,
  'an illustration path in another profile''s folder is rejected'
);

select throws_ok(
  $$select public.create_my_poem('T', 'X', 'g', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/../dddddddd-dddd-4ddd-8ddd-dddddddddddd/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.png')$$,
  '23514', null,
  'an illustration path escaping the own folder with dot segments is rejected'
);

select is(public.can_create_poem()->>'status', 'allowed', 'can_create_poem() allows a public author under the limit');

select is(
  public.create_my_poem('Первый снег', E'Строка один\nСтрока два', null, null)->>'status',
  'created',
  'create_my_poem() stores a poem without a genre or illustration'
);

-- The upper bounds: an 80-character title and a 10000-character text, with a genre and an own illustration.
select is(
  public.create_my_poem(
    repeat('я', 80), repeat('я', 10000), '5KsDBWseXY6QegucYAoacS',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg'
  )->>'status',
  'created',
  'create_my_poem() stores an 80-character title, a 10000-character text, a genre, and an own illustration'
);

select results_eq(
  $$select author_id::text, title, genre_id, illustration_path
    from public.poems where created_at = now() order by char_length(title)$$,
  $$values
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Первый снег', null::text, null::text),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', repeat('я', 80), '5KsDBWseXY6QegucYAoacS',
     'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg')$$,
  'both created poems belong to the caller''s own profile, with what was passed'
);

-- No short window: a third create within the same minute is stored (FR-6, "Quick creates within the limit").
select is(
  public.create_my_poem('Третье', 'X', null, null)->>'status',
  'created',
  'the 3rd create in a minute is stored: there is no per-minute limit'
);

select results_eq(
  $$select count(*)::int from public.poems where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  array[4],
  'B has the old poem and the three new ones'
);

select is(public.can_create_poem()->>'status', 'allowed', 'can_create_poem() still allows B, far under 100 in 30 days');

-- The creation log is reachable only through the definer functions and the trigger.
select throws_ok($$select * from public.poem_creations$$, '42501', null, 'a signed-in user cannot read the creation log');

select throws_ok(
  $$insert into public.poem_creations (author_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', null,
  'a signed-in user cannot add to the creation log'
);

select throws_ok(
  $$delete from public.poem_creations$$,
  '42501', null,
  'a signed-in user cannot remove from the creation log'
);

select throws_ok($$select * from public.poem_create_limits()$$, '42501', null, 'a signed-in user cannot call poem_create_limits()');

-- Deleting through the function (delete-poem D2).
select is(
  public.delete_my_poem('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  '{"status": "not-found"}'::jsonb,
  'delete_my_poem() answers not-found for an unknown id'
);

select is(
  public.delete_my_poem((select id from public.poems where title = repeat('я', 80))),
  '{"status": "deleted", "author_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "illustration_path": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg"}'::jsonb,
  'the owner deletes their poem and gets its author id and illustration path'
);

select is_empty(
  $$select id from public.poems where title = repeat('я', 80)$$,
  'the deleted poem is gone'
);

-- Storage, as B.
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('poem-illustrations', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg')$$,
  'a public author uploads into their own folder'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('poem-illustrations', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd/ffffffff-ffff-4fff-8fff-ffffffffffff.jpg')$$,
  '42501', null,
  'a user cannot upload into another profile''s folder'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('poem-illustrations', 'not-a-uuid/ffffffff-ffff-4fff-8fff-ffffffffffff.jpg')$$,
  '42501', null,
  'an upload into a malformed folder fails with the RLS error, not a uuid cast error'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('poem-illustrations', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/page.html')$$,
  '42501', null,
  'an upload whose file name is not <uuid>.png|jpg is rejected'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('poem-illustrations', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/sub/ffffffff-ffff-4fff-8fff-ffffffffffff.png')$$,
  '42501', null,
  'an upload into a subfolder is rejected'
);

select isnt_empty(
  $$select name from storage.objects
    where bucket_id = 'poem-illustrations' and name like 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/%'$$,
  'the owner sees the illustrations in their own folder'
);

-- Direct deletes are blocked by Storage's own guard unless this is set; we test the policy, not the guard.
select set_config('storage.allow_delete_query', 'true', true);

select isnt_empty(
  $$delete from storage.objects
    where bucket_id = 'poem-illustrations'
      and name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg'
    returning name$$,
  'the owner deletes an illustration in their own folder (the best-effort cleanup)'
);

reset role;
insert into storage.objects (bucket_id, name) values
  ('poem-illustrations', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd/99999999-9999-4999-8999-999999999999.png');
set local role authenticated;

select is_empty(
  $$select name from storage.objects
    where bucket_id = 'poem-illustrations' and name like 'dddddddd-dddd-4ddd-8ddd-dddddddddddd/%'$$,
  'a user does not see illustrations in another profile''s folder'
);

select is_empty(
  $$delete from storage.objects
    where bucket_id = 'poem-illustrations'
      and name = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd/99999999-9999-4999-8999-999999999999.png'
    returning name$$,
  'a user cannot delete an illustration in another profile''s folder'
);

reset role;

-- ---------- signed in as A (non-public profile) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(public.can_create_poem()->>'status', 'not-public', 'can_create_poem() returns not-public for a non-public profile');

select is(
  public.create_my_poem('T', 'X', null, null)->>'status',
  'not-public',
  'create_my_poem() returns not-public for a non-public profile'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('poem-illustrations', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.png')$$,
  '42501', null,
  'a non-public author cannot upload an illustration, not even into their own folder'
);

reset role;

select results_eq(
  $$select count(*)::int from public.poems where author_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  array[1],
  'the not-public create stored nothing'
);

-- Accepted (design D2, Risks): deleting is not gated by public status, so an owner can remove their own poem
-- even with a non-public profile. Recorded here so a later change can't widen it by accident.
set local role authenticated;

select is(
  public.delete_my_poem('a0000000-0000-4000-8000-000000000001'),
  '{"status": "deleted", "author_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "illustration_path": null}'::jsonb,
  'an owner with a non-public profile can still delete their own poem'
);

reset role;

select is_empty(
  $$select id from public.poems where id = 'a0000000-0000-4000-8000-000000000001'$$,
  'the non-public owner''s poem is gone'
);

-- ---------- signed in as C (no profile) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);

select is(public.can_create_poem()->>'status', 'not-public', 'can_create_poem() returns not-public without a profile');

select is(
  public.create_my_poem('T', 'X', null, null)->>'status',
  'not-public',
  'create_my_poem() returns not-public without a profile'
);

reset role;

select is_empty(
  $$select 1 from public.author_profiles where user_id = '33333333-3333-4333-8333-333333333333'$$,
  'create_my_poem() creates no profile for a caller without one'
);

-- ---------- signed in as D (100 poems in the last 30 days) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);

select is(public.can_create_poem()->>'status', 'over-limit', 'can_create_poem() returns over-limit at 100 poems in 30 days');

select ok(
  (select (public.create_my_poem('Сто первое', 'X', null, null) = '{"status": "over-limit"}'::jsonb)),
  'the 101st create in 30 days returns over-limit'
);

reset role;

select results_eq(
  $$select count(*)::int from public.poems where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  array[100],
  'the 101st create stored nothing'
);

-- The oldest of the 100 creations turns exactly 30 days old: the window is strict (created_at > now() -
-- 30 days), so that creation no longer counts and the window slides. The limit counts the creation log, not
-- the poems (delete-poem FR-9), so the log row is what ages.
update public.poem_creations set created_at = now() - interval '30 days'
where ctid = (
  select ctid from public.poem_creations where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  order by created_at limit 1
);

-- An aged creation of another author (B): D's next create prunes only D's own rows, so this one must stay.
insert into public.poem_creations (author_id, created_at)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now() - interval '31 days');

set local role authenticated;
select is(public.can_create_poem()->>'status', 'allowed', 'a poem exactly 30 days old no longer counts: 99 in the window, allowed');

-- Rejected calls store nothing, so three of them don't use up the one free place.
select throws_ok(
  $$select public.create_my_poem('   ', 'X', null, null)$$,
  '23514', null,
  'a blank title is rejected at 99 poems'
);

select throws_ok(
  $$select public.create_my_poem(repeat('я', 81), 'X', null, null)$$,
  '23514', null,
  'an 81-character title is rejected at 99 poems'
);

select throws_ok(
  $$select public.create_my_poem('T', 'X', null, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.png')$$,
  '23514', null,
  'an illustration path in another profile''s folder is rejected at 99 poems'
);

select is(
  public.create_my_poem('Сотое', 'X', null, null)->>'status',
  'created',
  'after three rejected calls, the 100th poem in the window is created'
);

select is(public.can_create_poem()->>'status', 'over-limit', 'back at 100 poems in 30 days, over-limit again');
reset role;

-- The 100th create logged itself and pruned the creation that had aged out of the window.
select results_eq(
  $$select count(*)::int from public.poem_creations where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  array[100],
  'each stored poem adds one creation row: 100 in the window'
);

select is_empty(
  $$select 1 from public.poem_creations
    where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' and created_at <= now() - interval '30 days'$$,
  'a creation 30 days old is pruned on the author''s next create'
);

select isnt_empty(
  $$select 1 from public.poem_creations
    where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and created_at <= now() - interval '30 days'$$,
  'D''s create leaves another author''s aged creations alone'
);

set local role authenticated;

select is(
  public.delete_my_poem('b0000000-0000-4000-8000-000000000001'),
  '{"status": "not-found"}'::jsonb,
  'another author''s poem answers not-found, the same as an unknown id'
);

-- implements FR-9 of delete-poem: deleting doesn't free a place in the create limit.
select results_eq(
  $$with victims as materialized (
      select id from public.poems where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      order by created_at desc limit 10
    )
    select count(*)::int from victims v where public.delete_my_poem(v.id)->>'status' = 'deleted'$$,
  array[10],
  'D deletes 10 of their poems'
);

select is(public.can_create_poem()->>'status', 'over-limit', 'after 100 creations and 10 deletes, can_create_poem() is still over-limit');

select ok(
  (select (public.create_my_poem('После удаления', 'X', null, null) = '{"status": "over-limit"}'::jsonb)),
  'after 100 creations and 10 deletes, create_my_poem() still answers over-limit'
);

reset role;

select results_eq(
  $$select count(*)::int from public.poems where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  array[91],
  'the 10 deletes removed D''s poems and the over-limit create stored nothing'
);

select isnt_empty(
  $$select id from public.poems where id = 'b0000000-0000-4000-8000-000000000001'$$,
  'the other author''s poem is still there'
);

-- ---------- a public author loses public status ----------
update public.author_profiles set last_name = null where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is_empty(
  $$select id from public.poems where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  'poems of a profile that lost its last name are invisible to anon'
);

select is(
  public.is_public_author_profile('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  true,
  'anon can call is_public_author_profile(): a public profile'
);

select is(
  public.is_public_author_profile('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  false,
  'is_public_author_profile() is false once the last name is cleared'
);

reset role;

select * from finish();
rollback;
