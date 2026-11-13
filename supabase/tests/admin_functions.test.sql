-- The admin functions, the internal delete functions, the storage policies for admins and the sign-up hook
-- (admin-moderation, design D2, D3, D6, D7, D10, D11).
-- implements FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11 of admin-moderation
-- implements FR-17 and NFR-1 of admin-moderation
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(137);

-- Start from empty content tables, so the checks below see only these fixtures and not the local seed. The whole
-- file runs in one transaction that is rolled back, so the seed survives.
delete from public.poems;
delete from public.author_profiles;
delete from public.moderation_log;

-- Fixtures, written as the superuser (bypasses RLS). All created far in the future, so they sort newest-first
-- ahead of any seeded user. ADM and ADM2 are admins (ADM has a profile of their own). ACT is an active author
-- with two sessions, a collection of two poems, a free poem and a free poem with an illustration. BLK is blocked.
-- BAN is banned. NOP is active, has no profile and has two sessions. MIX is active with an untidy address and one
-- session. NONE is an id no user has.
insert into auth.users (id, email, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'adm@example.test', '2099-01-01 00:00:00+00'),
  ('66666666-6666-4666-8666-666666666666', 'adm2@example.test', '2099-01-02 00:00:00+00'),
  ('22222222-2222-4222-8222-222222222222', 'act@example.test', '2099-01-03 00:00:00+00'),
  ('33333333-3333-4333-8333-333333333333', 'blk@example.test', '2099-01-04 00:00:00+00'),
  ('44444444-4444-4444-8444-444444444444', 'ban@example.test', '2099-01-05 00:00:00+00'),
  ('55555555-5555-4555-8555-555555555555', 'nop@example.test', '2099-01-06 00:00:00+00'),
  ('77777777-7777-4777-8777-777777777777', ' Mixed@Example.Test ', '2099-01-07 00:00:00+00');

insert into public.admins (user_id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('66666666-6666-4666-8666-666666666666');

insert into public.author_profiles (id, user_id, first_name, last_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Anna', 'Admin'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Boris', 'Active'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', 'Clara', 'Blocked');

insert into public.collections (id, author_id, title) values
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Active collection');

insert into public.poems (id, author_id, collection_id, title, text, position, illustration_path) values
  ('b0000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'b1000000-0000-4000-8000-000000000001', 'In collection one', 'Text one', 0, null),
  ('b0000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'b1000000-0000-4000-8000-000000000001', 'In collection two', 'Text two', 1, null),
  ('b0000000-0000-4000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, 'Free', 'Free text', 5, null),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, 'Illustrated',
   'Secret poem text', 6, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000001.png');

insert into public.account_restrictions (user_id, kind, created_by) values
  ('33333333-3333-4333-8333-333333333333', 'blocked', '11111111-1111-4111-8111-111111111111'),
  ('44444444-4444-4444-8444-444444444444', 'banned', '11111111-1111-4111-8111-111111111111');
update auth.users set banned_until = now() + interval '100 years'
  where id in ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444');

insert into auth.sessions (id, user_id) values
  ('a1000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222'),
  ('a1000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222'),
  ('a1000000-0000-4000-8000-000000000003', '55555555-5555-4555-8555-555555555555'),
  ('a1000000-0000-4000-8000-000000000004', '55555555-5555-4555-8555-555555555555'),
  ('a1000000-0000-4000-8000-000000000005', '77777777-7777-4777-8777-777777777777');

-- Two illustration files in ACT's folder: one for the admin to remove, one for a non-admin to fail on.
insert into storage.objects (bucket_id, name) values
  ('poem-illustrations', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000001.png'),
  ('poem-illustrations', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000002.png');

-- ---------- What is there, and who can call it (NFR-1) ----------

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'),
  7,
  'there are seven admin functions (a new one means updating the allowlist in admin_foundation.test.sql)'
);

select is_empty(
  $$select p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'admin\_%'
      and (
        not p.prosecdef
        or p.proconfig is null
        or not ('search_path=""' = any (p.proconfig))
        or p.prosrc !~ 'perform\s+public\.assert_admin\s*\('
      )$$,
  'every admin function is security definer, has an empty search_path and calls assert_admin()'
);

select is(
  (select count(*)::int from unnest(array[
      'public.admin_list_users(integer, timestamptz, uuid, text)', 'public.admin_block_user(uuid)',
      'public.admin_unblock_user(uuid)', 'public.admin_ban_user(uuid)', 'public.admin_revoke_sessions(uuid)',
      'public.admin_delete_poem(uuid)', 'public.admin_delete_collection(uuid)', 'public.may_moderate_author(uuid)'
    ]) f
    where has_function_privilege('authenticated', f, 'execute')
      and not has_function_privilege('anon', f, 'execute')
      and not has_function_privilege('public', f, 'execute')),
  8,
  'the admin functions and may_moderate_author are executable by authenticated only'
);

select is(
  (select count(*)::int from unnest(array[
      'public.delete_poem_of(uuid, uuid)', 'public.delete_collection_of(uuid, uuid)',
      'public.apply_restriction(uuid, text)', 'public.log_moderation(text, uuid, text, uuid)',
      'public.banned_email_hash(text)'
    ]) f
    where not has_function_privilege('authenticated', f, 'execute')
      and not has_function_privilege('anon', f, 'execute')
      and not has_function_privilege('public', f, 'execute')),
  5,
  'the internal functions are executable by no client role'
);

-- The one home of the ban-list digest: the same value for the address however it is written. Both admin_ban_user
-- and the sign-up hook call it (debug record ban-hash-rule-written-twice).
select is(
  public.banned_email_hash('  Foo@Example.Test '),
  encode(sha256(convert_to('foo@example.test', 'UTF8')), 'hex'),
  'the ban-list digest is the sha256 of the trimmed, lower-cased address');

-- A block never replaces a ban (FR-4): the second writer of a race must not turn `banned` into `blocked`
-- (debug record concurrent-block-downgrades-a-ban). BAN is banned in the fixtures above.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select public.apply_restriction('44444444-4444-4444-8444-444444444444', 'blocked');
select is(
  (select kind from public.account_restrictions where user_id = '44444444-4444-4444-8444-444444444444'),
  'banned',
  'applying a block to a banned account leaves it banned');

select is(has_function_privilege('supabase_auth_admin', 'public.reject_banned_signup(jsonb)', 'execute'), true,
  'the auth service can execute the sign-up hook');
select is(has_schema_privilege('supabase_auth_admin', 'public', 'usage'), true,
  'the auth service can reach the public schema the hook lives in');
select is(has_function_privilege('authenticated', 'public.reject_banned_signup(jsonb)', 'execute'), false,
  'authenticated cannot execute the sign-up hook');
select is(has_function_privilege('anon', 'public.reject_banned_signup(jsonb)', 'execute'), false,
  'anon cannot execute the sign-up hook');
select is(has_function_privilege('public', 'public.reject_banned_signup(jsonb)', 'execute'), false,
  'public cannot execute the sign-up hook');

-- ---------- anon: every function refused (NFR-1) ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$select * from public.admin_list_users(5)$$, '42501', null, 'anon cannot list users');
select throws_ok($$select public.admin_block_user('22222222-2222-4222-8222-222222222222')$$, '42501', null, 'anon cannot block');
select throws_ok($$select public.admin_unblock_user('33333333-3333-4333-8333-333333333333')$$, '42501', null, 'anon cannot unblock');
select throws_ok($$select public.admin_ban_user('22222222-2222-4222-8222-222222222222')$$, '42501', null, 'anon cannot ban');
select throws_ok($$select public.admin_revoke_sessions('22222222-2222-4222-8222-222222222222')$$, '42501', null, 'anon cannot revoke');
select throws_ok($$select public.admin_delete_poem('b0000000-0000-4000-8000-000000000004')$$, '42501', null, 'anon cannot delete a poem');
select throws_ok($$select public.admin_delete_collection('b1000000-0000-4000-8000-000000000001')$$, '42501', null, 'anon cannot delete a collection');
select throws_ok($$select public.may_moderate_author('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$, '42501', null, 'anon cannot ask may_moderate_author');
select throws_ok(
  $$select public.delete_poem_of('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000004')$$,
  '42501', null, 'anon cannot call delete_poem_of');
select throws_ok(
  $$select public.reject_banned_signup('{}'::jsonb)$$, '42501', null, 'anon cannot probe the sign-up hook');

-- ---------- ACT: a signed-in non-admin ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select throws_ok($$select * from public.admin_list_users(5)$$, '42501', 'not an admin', 'a non-admin cannot list users');
select throws_ok($$select public.admin_block_user('55555555-5555-4555-8555-555555555555')$$, '42501', 'not an admin', 'a non-admin cannot block');
select throws_ok($$select public.admin_unblock_user('33333333-3333-4333-8333-333333333333')$$, '42501', 'not an admin', 'a non-admin cannot unblock');
select throws_ok($$select public.admin_ban_user('55555555-5555-4555-8555-555555555555')$$, '42501', 'not an admin', 'a non-admin cannot ban');
select throws_ok($$select public.admin_revoke_sessions('55555555-5555-4555-8555-555555555555')$$, '42501', 'not an admin', 'a non-admin cannot revoke');
select throws_ok($$select public.admin_delete_poem('b0000000-0000-4000-8000-000000000004')$$, '42501', 'not an admin', 'a non-admin cannot delete a poem');
select throws_ok($$select public.admin_delete_collection('b1000000-0000-4000-8000-000000000001')$$, '42501', 'not an admin', 'a non-admin cannot delete a collection');
select throws_ok(
  $$select public.delete_poem_of('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000004')$$,
  '42501', null, 'a signed-in user cannot call delete_poem_of');
select throws_ok(
  $$select public.delete_collection_of('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'a signed-in user cannot call delete_collection_of');
select throws_ok(
  $$select public.reject_banned_signup('{}'::jsonb)$$, '42501', null, 'a signed-in user cannot probe the sign-up hook');
select throws_ok(
  $$select public.apply_restriction('55555555-5555-4555-8555-555555555555', 'blocked')$$,
  '42501', null, 'a signed-in user cannot call apply_restriction');
select throws_ok(
  $$select public.log_moderation('x', '55555555-5555-4555-8555-555555555555', 'user', '55555555-5555-4555-8555-555555555555')$$,
  '42501', null, 'a signed-in user cannot write the log');

select is(public.may_moderate_author('cccccccc-cccc-4ccc-8ccc-cccccccccccc'), false,
  'may_moderate_author answers false, not an error, for a non-admin');

-- A non-admin sees and removes nothing in another author's illustration folder.
select set_config('storage.allow_delete_query', 'true', true);
-- ACT owns the folder, so use NOP below for the "someone else" check; here the owner still sees their own file.
select isnt_empty(
  $$select 1 from storage.objects where bucket_id = 'poem-illustrations'
    and name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000002.png'$$,
  'the owner still sees their own illustration');

-- Nothing the non-admin tried changed anything.
reset role;
select is((select count(*)::int from public.poems where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 4,
  'the non-admin attempts left every poem in place');
select is((select count(*)::int from public.moderation_log), 0, 'the non-admin attempts wrote no log row');
select is((select count(*)::int from public.account_restrictions), 2, 'the non-admin attempts changed no restriction');

-- ---------- NOP: a signed-in non-admin who is nobody's owner here (storage) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}', true);
select set_config('storage.allow_delete_query', 'true', true);

select is_empty(
  $$select 1 from storage.objects where bucket_id = 'poem-illustrations'
    and name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000002.png'$$,
  'a non-admin does not see another author''s illustration');
select is_empty(
  $$delete from storage.objects where bucket_id = 'poem-illustrations'
    and name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000002.png' returning name$$,
  'a non-admin removes nothing of another author''s illustration');

-- ---------- ADM: the admin ----------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select set_config('storage.allow_delete_query', 'true', true);

-- Storage (FR-8, design D11).
select isnt_empty(
  $$select 1 from storage.objects where bucket_id = 'poem-illustrations'
    and name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000002.png'$$,
  'an admin sees another author''s illustration');
select isnt_empty(
  $$delete from storage.objects where bucket_id = 'poem-illustrations'
    and name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000002.png' returning name$$,
  'an admin removes another author''s illustration');

-- The user list (FR-3).
select is((select count(*)::int from public.admin_list_users(3)), 3, 'a page holds the requested number of rows');
select is(
  (select array_agg(user_email order by created_at desc, id desc) from public.admin_list_users(3)),
  array[' Mixed@Example.Test ', 'nop@example.test', 'ban@example.test'],
  'the first page is the newest rows, newest first, with each address as stored'
);
select is(
  (select array_agg(user_email order by created_at desc, id desc) from public.admin_list_users(
    3, '2099-01-05 00:00:00+00', '44444444-4444-4444-8444-444444444444')),
  array['blk@example.test', 'act@example.test', 'adm2@example.test'],
  'the cursor continues after the last row of the page');
select is(
  (select array_agg(user_email order by created_at desc, id desc) from public.admin_list_users(
    1, '2099-01-02 00:00:00+00', '66666666-6666-4666-8666-666666666666')),
  array['adm@example.test'],
  'the last page holds the rest and nothing newer');
select throws_ok(
  $$select * from public.admin_list_users(3, '2099-01-05 00:00:00+00', null)$$, '22023', null,
  'a cursor with only its date is refused, not answered with an empty page');
select throws_ok(
  $$select * from public.admin_list_users(3, null, '44444444-4444-4444-8444-444444444444')$$, '22023', null,
  'a cursor with only its id is refused');
select is(
  (select user_email from public.admin_list_users(1, null, null, 'act@example.test')),
  'act@example.test',
  'the email filter returns the one row');
select is(
  (select count(*)::int from public.admin_list_users(10, null, null, 'act@example')), 0,
  'the email filter is the whole address, not a part of it');
select is(
  (select id from public.admin_list_users(10, null, null, '  ACT@Example.Test  ')),
  '22222222-2222-4222-8222-222222222222'::uuid,
  'the email filter ignores case and spaces in the input');
select is(
  (select id from public.admin_list_users(10, null, null, 'mixed@example.test')),
  '77777777-7777-4777-8777-777777777777'::uuid,
  'the email filter ignores case and spaces in the stored address');
select is(
  (select author_name from public.admin_list_users(1, null, null, 'act@example.test')),
  'Boris Active', 'a row carries the author name');
select is(
  (select author_name from public.admin_list_users(1, null, null, 'nop@example.test')), null,
  'a row without a profile has no author name');
select is(
  (select restriction from public.admin_list_users(1, null, null, 'blk@example.test')), 'blocked',
  'a blocked row says blocked');
select is(
  (select restriction from public.admin_list_users(1, null, null, 'ban@example.test')), 'banned',
  'a banned row says banned');
select is(
  (select is_admin from public.admin_list_users(1, null, null, 'adm2@example.test')), true,
  'an admin''s row carries the admin flag');
select is(
  (select is_admin from public.admin_list_users(1, null, null, 'act@example.test')), false,
  'another row does not');

-- may_moderate_author (FR-10).
select is(public.may_moderate_author('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), true,
  'an admin may moderate another author');
select is(public.may_moderate_author('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), false,
  'an admin may not moderate their own profile');

-- Block (FR-4, FR-7).
select is((select public.admin_block_user('22222222-2222-4222-8222-222222222222') ->> 'status'), 'blocked',
  'an admin blocks an active user');
select is((select public.admin_block_user('22222222-2222-4222-8222-222222222222') ->> 'status'), 'already-restricted',
  'blocking twice answers already-restricted');
select is((select public.admin_block_user('33333333-3333-4333-8333-333333333333') ->> 'status'), 'already-restricted',
  'blocking a blocked user answers already-restricted');
select is((select public.admin_block_user('44444444-4444-4444-8444-444444444444') ->> 'status'), 'already-restricted',
  'blocking a banned user answers already-restricted');
select is((select public.admin_block_user('11111111-1111-4111-8111-111111111111') ->> 'status'), 'target-is-admin',
  'an admin cannot block themselves');
select is((select public.admin_block_user('66666666-6666-4666-8666-666666666666') ->> 'status'), 'target-is-admin',
  'an admin cannot block another admin');
select is((select public.admin_block_user('99999999-9999-4999-8999-999999999999') ->> 'status'), 'not-found',
  'blocking an unknown id answers not-found');

reset role;
select is((select kind from public.account_restrictions where user_id = '22222222-2222-4222-8222-222222222222'),
  'blocked', 'the block is recorded');
select is((select count(*)::int from auth.sessions where user_id = '22222222-2222-4222-8222-222222222222'), 0,
  'the block ended every session');
select ok(
  (select banned_until > now() + interval '99 years' and banned_until < now() + interval '101 years'
     and banned_until <> 'infinity'
   from auth.users where id = '22222222-2222-4222-8222-222222222222'),
  'the block set a finite far-future banned_until');
select is((select count(*)::int from public.moderation_log), 1, 'only the successful block was logged');
select is(
  (select action || '/' || target_kind || '/' || admin_id || '/' || target_user_id || '/' || target_id
   from public.moderation_log),
  'block/user/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/22222222-2222-4222-8222-222222222222',
  'the log row names the admin, the action and the user');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

-- Unblock (FR-4).
select is((select public.admin_unblock_user('22222222-2222-4222-8222-222222222222') ->> 'status'), 'unblocked',
  'an admin unblocks a blocked user');
select is((select public.admin_unblock_user('22222222-2222-4222-8222-222222222222') ->> 'status'), 'not-blocked',
  'unblocking an active user answers not-blocked');
select is((select public.admin_unblock_user('44444444-4444-4444-8444-444444444444') ->> 'status'), 'not-blocked',
  'a banned user cannot be unblocked');
select is((select public.admin_unblock_user('99999999-9999-4999-8999-999999999999') ->> 'status'), 'not-blocked',
  'unblocking an unknown id answers not-blocked');

reset role;
select is((select count(*)::int from public.account_restrictions where user_id = '22222222-2222-4222-8222-222222222222'),
  0, 'the unblock removed the restriction');
select is((select banned_until from auth.users where id = '22222222-2222-4222-8222-222222222222'), null,
  'the unblock cleared banned_until');
select is((select kind from public.account_restrictions where user_id = '44444444-4444-4444-8444-444444444444'),
  'banned', 'the banned user is still banned');
select is((select count(*)::int from public.moderation_log), 2, 'the unblock was logged and the no-ops were not');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

-- Ban (FR-5, FR-7).
select is((select public.admin_ban_user('33333333-3333-4333-8333-333333333333') ->> 'status'), 'banned',
  'an admin bans a blocked user');
select is((select public.admin_ban_user('33333333-3333-4333-8333-333333333333') ->> 'status'), 'already-restricted',
  'banning twice answers already-restricted');
select is((select public.admin_ban_user('44444444-4444-4444-8444-444444444444') ->> 'status'), 'already-restricted',
  'banning a banned user answers already-restricted');
select is((select public.admin_ban_user('77777777-7777-4777-8777-777777777777') ->> 'status'), 'banned',
  'an admin bans an active user');
select is((select public.admin_ban_user('66666666-6666-4666-8666-666666666666') ->> 'status'), 'target-is-admin',
  'an admin cannot ban another admin');
select is((select public.admin_ban_user('11111111-1111-4111-8111-111111111111') ->> 'status'), 'target-is-admin',
  'an admin cannot ban themselves');
select is((select public.admin_ban_user('99999999-9999-4999-8999-999999999999') ->> 'status'), 'not-found',
  'banning an unknown id answers not-found');

reset role;
select is((select kind from public.account_restrictions where user_id = '33333333-3333-4333-8333-333333333333'),
  'banned', 'the blocked user''s restriction became banned');
select is((select count(*)::int from public.account_restrictions where user_id = '33333333-3333-4333-8333-333333333333'),
  1, 'the ban replaced the block row');
select is((select count(*)::int from auth.sessions where user_id = '77777777-7777-4777-8777-777777777777'), 0,
  'the ban ended the active user''s session');
select ok(
  (select banned_until > now() + interval '99 years' and banned_until <> 'infinity'
   from auth.users where id = '77777777-7777-4777-8777-777777777777'),
  'the ban set a finite far-future banned_until');
select ok(
  exists (select 1 from public.banned_emails
          where email_hash = encode(sha256(convert_to('blk@example.test', 'UTF8')), 'hex')),
  'the ban list holds the sha256 of the blocked user''s address');
select ok(
  exists (select 1 from public.banned_emails
          where email_hash = encode(sha256(convert_to('mixed@example.test', 'UTF8')), 'hex')),
  'the stored hash is of the trimmed, lower-cased address');
select is((select count(*)::int from public.banned_emails), 2, 'only the two bans added a hash');
select is((select count(*)::int from public.moderation_log where action = 'ban'), 2, 'each ban was logged once');
select is((select count(*)::int from public.moderation_log), 4, 'no no-op ban was logged');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

-- Revoke (FR-6, FR-7).
select is((select public.admin_revoke_sessions('55555555-5555-4555-8555-555555555555') ->> 'status'), 'revoked',
  'an admin revokes the sessions of a user with two');
select is((select public.admin_revoke_sessions('55555555-5555-4555-8555-555555555555') ->> 'status'), 'no-sessions',
  'revoking a user with none answers no-sessions');
select is((select public.admin_revoke_sessions('11111111-1111-4111-8111-111111111111') ->> 'status'), 'target-is-admin',
  'an admin cannot revoke their own sessions');
select is((select public.admin_revoke_sessions('66666666-6666-4666-8666-666666666666') ->> 'status'), 'target-is-admin',
  'an admin cannot revoke another admin''s sessions');
select is((select public.admin_revoke_sessions('99999999-9999-4999-8999-999999999999') ->> 'status'), 'not-found',
  'revoking an unknown id answers not-found');

reset role;
select is((select count(*)::int from auth.sessions where user_id = '55555555-5555-4555-8555-555555555555'), 0,
  'the revoke ended every session');
select is((select count(*)::int from public.account_restrictions where user_id = '55555555-5555-4555-8555-555555555555'),
  0, 'the revoke left the account active');
select is((select banned_until from auth.users where id = '55555555-5555-4555-8555-555555555555'), null,
  'the revoke did not touch banned_until');
select is((select count(*)::int from public.moderation_log where action = 'revoke-sessions'), 1,
  'the revoke was logged once and the no-ops were not');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

-- Delete a collection (FR-9): its two poems become free poems, placed first among the author's free poems.
select is(
  (select public.admin_delete_collection('b1000000-0000-4000-8000-000000000001') ->> 'status'), 'deleted',
  'an admin deletes another user''s collection');
select is(
  (select public.admin_delete_collection('b1000000-0000-4000-8000-000000000001') ->> 'status'), 'not-found',
  'deleting it again answers not-found');
select is(
  (select public.admin_delete_collection('99999999-9999-4999-8999-999999999999') ->> 'status'), 'not-found',
  'an unknown collection answers not-found');

reset role;
select is((select count(*)::int from public.collections where id = 'b1000000-0000-4000-8000-000000000001'), 0,
  'the collection is gone');
select is(
  (select array_agg(position order by position) from public.poems
    where id in ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003')
      and collection_id is null),
  array[3, 4],
  'both poems are free and sit before the author''s other free poems (positions 3 and 4, before 5)');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  (select public.admin_delete_collection('b1000000-0000-4000-8000-000000000001')), '{"status": "not-found"}'::jsonb,
  'the not-found answer carries only the status');

-- Delete a poem (FR-8).
select is(
  (select public.admin_delete_poem('b0000000-0000-4000-8000-000000000001')),
  '{"status": "deleted", "author_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "illustration_path": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000001.png"}'::jsonb,
  'an admin deletes another user''s poem and gets the author and the illustration path');
select is(
  (select public.admin_delete_poem('b0000000-0000-4000-8000-000000000001') ->> 'status'), 'not-found',
  'deleting it again answers not-found');
select is(
  (select public.admin_delete_poem('99999999-9999-4999-8999-999999999999') ->> 'status'), 'not-found',
  'an unknown poem answers not-found');

reset role;
select is((select count(*)::int from public.poems where id = 'b0000000-0000-4000-8000-000000000001'), 0,
  'the poem is gone');
select is((select count(*)::int from public.poems where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 3,
  'the author''s other poems are untouched');
select is(
  (select count(*)::int from public.poem_creations where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 4,
  'the creation-log rows are kept');

-- The log (FR-11).
select is(
  (select count(*)::int from public.moderation_log where action in ('delete-poem', 'delete-collection')), 2,
  'each content delete was logged once, and the not-found answers were not');
select is(
  (select target_user_id from public.moderation_log where action = 'delete-poem'),
  '22222222-2222-4222-8222-222222222222'::uuid,
  'a poem delete is logged against its author''s user id');
select is(
  (select target_id from public.moderation_log where action = 'delete-poem'),
  'b0000000-0000-4000-8000-000000000001'::uuid,
  'a poem delete is logged with the poem id');
select is(
  (select target_user_id from public.moderation_log where action = 'delete-collection'),
  '22222222-2222-4222-8222-222222222222'::uuid,
  'a collection delete is logged against its author''s user id');
select is(
  (select count(*)::int from public.moderation_log m where m::text ~* 'secret|Illustrated|Active collection'), 0,
  'no log row holds any text of the deleted content');
select is((select count(*)::int from public.moderation_log), 7, 'the whole run wrote seven rows, one per change');

-- The log is closed to clients (FR-11).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select throws_ok('select * from public.moderation_log', '42501', null, 'an admin cannot read the log through the API');
select throws_ok(
  $$insert into public.moderation_log (admin_id, action, target_user_id, target_kind, target_id)
    values ('11111111-1111-4111-8111-111111111111', 'x', '11111111-1111-4111-8111-111111111111', 'user',
            '11111111-1111-4111-8111-111111111111')$$,
  '42501', null, 'an admin cannot write the log through the API');

-- A deleted account (FR-11): the log rows and the ban list stay, the restriction goes with the account.
reset role;
select is((select count(*)::int from public.moderation_log where target_user_id = '33333333-3333-4333-8333-333333333333'),
  1, 'the banned user has one log row before their account goes');
delete from auth.users where id = '33333333-3333-4333-8333-333333333333';
select is((select count(*)::int from public.moderation_log where target_user_id = '33333333-3333-4333-8333-333333333333'),
  1, 'the log row stays after the account is deleted');
select is((select count(*)::int from public.account_restrictions where user_id = '33333333-3333-4333-8333-333333333333'),
  0, 'the restriction row went with the account');
select ok(
  exists (select 1 from public.banned_emails
          where email_hash = encode(sha256(convert_to('blk@example.test', 'UTF8')), 'hex')),
  'the address stays banned after the account is deleted');

-- ---------- The sign-up hook (FR-17) ----------
-- Called as the migration role: the test connection cannot become supabase_auth_admin, and who may execute the
-- hook is proven by the privilege checks at the top of this file.

select is(
  public.reject_banned_signup(jsonb_build_object('user', jsonb_build_object('email', 'blk@example.test'))),
  '{"error": {"http_code": 403, "message": "signup not allowed"}}'::jsonb,
  'the hook rejects a banned address with the fixed code and message');
select is(
  public.reject_banned_signup(jsonb_build_object('user', jsonb_build_object('email', '  BLK@Example.Test '))),
  '{"error": {"http_code": 403, "message": "signup not allowed"}}'::jsonb,
  'the hook ignores case and spaces');
select is(
  public.reject_banned_signup(jsonb_build_object('user', jsonb_build_object('email', 'fresh@example.test'))),
  '{}'::jsonb,
  'the hook allows an address that is not banned');
select is(public.reject_banned_signup('{}'::jsonb), '{}'::jsonb, 'the hook allows an event with no user');
select is(
  public.reject_banned_signup(jsonb_build_object('user', jsonb_build_object('phone', '123'))), '{}'::jsonb,
  'the hook allows an event with no email');
select is(public.reject_banned_signup('"text"'::jsonb), '{}'::jsonb, 'the hook allows an event of an unexpected shape');
select is(public.reject_banned_signup(null), '{}'::jsonb, 'the hook allows a null event');

-- A failing lookup still allows: take the table away for the rest of this transaction.
alter table public.banned_emails rename to banned_emails_hidden;
select is(
  public.reject_banned_signup(jsonb_build_object('user', jsonb_build_object('email', 'blk@example.test'))),
  '{}'::jsonb,
  'the hook allows when its lookup fails');
alter table public.banned_emails_hidden rename to banned_emails;

select * from finish();
rollback;
