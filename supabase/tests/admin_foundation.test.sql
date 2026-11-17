-- The admin role, the four closed moderation tables, and the restriction check in every writer and in the
-- direct-write policies (admin-moderation, design D1, D5).
-- implements FR-1 and NFR-1 of admin-moderation
-- implements FR-13 of admin-moderation
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(79);

-- Start from empty tables, so the checks below see only these fixtures and not the local seed. The whole file
-- runs in one transaction that is rolled back, so the seed survives.
delete from public.poems;
delete from public.author_profiles;

-- Fixtures, written as the superuser (bypasses RLS). ADM is an admin without a profile. ACT is an active author
-- with a free poem and a collection. BLK is a blocked author with a poem in a collection and a free poem. BAN
-- is a banned author. NOP is a signed-in user with no profile.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'adm@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'act@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'blk@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'ban@example.test'),
  ('55555555-5555-4555-8555-555555555555', 'nop@example.test');

insert into public.author_profiles (id, user_id, first_name, last_name) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Boris', 'Active'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', 'Clara', 'Blocked'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', 'Denis', 'Banned');

insert into public.collections (id, author_id, title) values
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Active collection'),
  ('c1000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Blocked collection');

insert into public.poems (id, author_id, collection_id, title, text) values
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, 'Active free', 'Text'),
  ('c0000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   'c1000000-0000-4000-8000-000000000001', 'Blocked in collection', 'Text'),
  ('c0000000-0000-4000-8000-000000000002', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', null, 'Blocked free', 'Text');

insert into public.admins (user_id) values ('11111111-1111-4111-8111-111111111111');

insert into public.account_restrictions (user_id, kind, created_by) values
  ('33333333-3333-4333-8333-333333333333', 'blocked', '11111111-1111-4111-8111-111111111111'),
  ('44444444-4444-4444-8444-444444444444', 'banned', '11111111-1111-4111-8111-111111111111');

-- Files for the direct-delete checks, one in each bucket for ACT and for BLK.
insert into storage.objects (bucket_id, name) values
  ('author-photos', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b2000000-0000-4000-8000-000000000001.png'),
  ('author-photos', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/c2000000-0000-4000-8000-000000000001.png'),
  ('poem-illustrations', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000001.png'),
  ('poem-illustrations', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/c3000000-0000-4000-8000-000000000001.png');

-- ---------- The closed tables (FR-1, NFR-1) ----------

select is(
  (select count(*)::int from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('admins', 'account_restrictions', 'banned_emails', 'moderation_log')
      and c.relrowsecurity),
  4,
  'row level security is on for the four moderation tables'
);

select is_empty(
  $$select policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('admins', 'account_restrictions', 'banned_emails', 'moderation_log')$$,
  'the four moderation tables have no policies'
);

select is_empty(
  $$select grantee, table_name from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('admins', 'account_restrictions', 'banned_emails', 'moderation_log')
      and grantee in ('anon', 'authenticated')$$,
  'anon and authenticated hold no grant on the four moderation tables'
);

-- ---------- anon ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok('select * from public.admins', '42501', null, 'anon cannot read admins');
select throws_ok('select * from public.account_restrictions', '42501', null, 'anon cannot read account_restrictions');
select throws_ok('select * from public.banned_emails', '42501', null, 'anon cannot read banned_emails');
select throws_ok('select * from public.moderation_log', '42501', null, 'anon cannot read moderation_log');

select throws_ok('select public.is_admin()', '42501', null, 'a signed-out caller cannot ask is_admin()');
select throws_ok('select public.is_restricted()', '42501', null, 'a signed-out caller cannot ask is_restricted()');
select throws_ok(
  $$select public.create_my_poem('T', 'X', null, null)$$, '42501', null,
  'anon cannot call a writer'
);

select isnt_empty(
  $$select 1 from public.poems where author_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  'anon still reads the public poems of a blocked author'
);

-- ---------- A signed-in caller with no user id ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

select is(public.is_restricted(), false, 'a caller with no user id is not restricted');
select throws_ok(
  $$select public.create_my_poem('T', 'X', null, null)$$, '42501', 'not signed in',
  'a caller with no user id still reaches the not-signed-in error, not the restriction one'
);

-- ---------- ACT: a signed-in non-admin, not restricted ----------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select is(public.is_admin(), false, 'a signed-in non-admin is not an admin');
select is(public.is_restricted(), false, 'an active user is not restricted');

select throws_ok('select * from public.admins', '42501', null, 'a signed-in user cannot read admins');
select throws_ok('select * from public.account_restrictions', '42501', null, 'a signed-in user cannot read account_restrictions');
select throws_ok('select * from public.banned_emails', '42501', null, 'a signed-in user cannot read banned_emails');
select throws_ok('select * from public.moderation_log', '42501', null, 'a signed-in user cannot read moderation_log');

select throws_ok(
  $$insert into public.admins (user_id) values ('22222222-2222-4222-8222-222222222222')$$, '42501', null,
  'a user cannot make themselves an admin through the API'
);
select throws_ok(
  $$update public.admins set user_id = '22222222-2222-4222-8222-222222222222'$$, '42501', null,
  'a user cannot update admins through the API'
);
select throws_ok(
  $$delete from public.admins$$, '42501', null,
  'a user cannot delete from admins through the API'
);
select is(public.is_admin(), false, 'the user is still not an admin after those attempts');
select throws_ok(
  $$insert into public.account_restrictions (user_id, kind, created_by)
    values ('22222222-2222-4222-8222-222222222222', 'blocked', '22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'a user cannot insert into account_restrictions'
);
select throws_ok(
  $$delete from public.account_restrictions$$, '42501', null,
  'a user cannot delete from account_restrictions'
);
select throws_ok(
  $$insert into public.banned_emails (email_hash) values (repeat('a', 64))$$, '42501', null,
  'a user cannot insert into banned_emails'
);
select throws_ok(
  $$insert into public.moderation_log (admin_id, action, target_user_id, target_kind, target_id)
    values ('22222222-2222-4222-8222-222222222222', 'x', '22222222-2222-4222-8222-222222222222', 'user',
            '22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'a user cannot insert into moderation_log'
);

select throws_ok('select public.assert_admin()', '42501', null, 'assert_admin() is not callable by a client role');
select throws_ok(
  'select public.assert_not_restricted()', '42501', null,
  'assert_not_restricted() is not callable by a client role'
);

-- An unblocked user writes (FR-13).
select is(
  (select public.create_my_poem('Active new', 'Text', null, null) ->> 'status'),
  'created',
  'an active user stores a poem'
);
select is(
  (select public.can_create_poem() ->> 'status'),
  'allowed',
  'can_create_poem() answers allowed for an active author'
);
select is(public.consume_write_allowance('profile_write'), true, 'an active user consumes a write allowance');

select isnt_empty(
  $$update public.author_profiles set about = 'Hello' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id$$,
  'an active owner updates their own profile directly'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('author-photos', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b2000000-0000-4000-8000-000000000002.png')$$,
  'an active owner uploads into their author-photos folder'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('poem-illustrations', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000002.png')$$,
  'an active owner uploads into their poem-illustrations folder'
);

select set_config('storage.allow_delete_query', 'true', true);

select isnt_empty(
  $$delete from storage.objects
    where bucket_id = 'author-photos'
      and name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b2000000-0000-4000-8000-000000000001.png'
    returning name$$,
  'an active owner deletes their own author photo'
);
select isnt_empty(
  $$delete from storage.objects
    where bucket_id = 'poem-illustrations'
      and name = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/b3000000-0000-4000-8000-000000000001.png'
    returning name$$,
  'an active owner deletes their own illustration'
);

-- ---------- BLK: blocked, access token still valid (FR-13) ----------
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);

select is(public.is_restricted(), true, 'a blocked user is restricted');
select is(public.is_admin(), false, 'a blocked user is not an admin');

select throws_ok(
  'select public.ensure_my_author_profile()', 'AM001', 'account restricted',
  'a blocked user cannot ensure their profile'
);
select throws_ok(
  $$select public.consume_write_allowance('profile_write')$$, 'AM001', 'account restricted',
  'a blocked user cannot consume a write allowance'
);
select throws_ok(
  $$select public.create_my_poem('T', 'X', null, null)$$, 'AM001', 'account restricted',
  'a blocked user cannot create a poem'
);
select throws_ok(
  'select public.can_create_poem()', 'AM001', 'account restricted',
  'a blocked user is refused by can_create_poem() before any upload'
);
select throws_ok(
  $$select public.update_my_poem('c0000000-0000-4000-8000-000000000002', 'Changed', 'Text', null, true, null)$$,
  'AM001', 'account restricted', 'a blocked user cannot update a poem'
);
select throws_ok(
  $$select public.delete_my_poem('c0000000-0000-4000-8000-000000000002')$$, 'AM001', 'account restricted',
  'a blocked user cannot delete a poem'
);
select throws_ok(
  $$select public.create_my_collection('T', null)$$, 'AM001', 'account restricted',
  'a blocked user cannot create a collection'
);
select throws_ok(
  $$select public.update_my_collection('c1000000-0000-4000-8000-000000000001', 'Changed', null)$$,
  'AM001', 'account restricted', 'a blocked user cannot update a collection'
);
select throws_ok(
  $$select public.delete_my_collection('c1000000-0000-4000-8000-000000000001')$$, 'AM001', 'account restricted',
  'a blocked user cannot delete a collection'
);
select throws_ok(
  $$select public.save_my_collection_poems(
      'c1000000-0000-4000-8000-000000000001',
      array['c0000000-0000-4000-8000-000000000002']::uuid[],
      array[]::uuid[])$$,
  'AM001', 'account restricted', 'a blocked user cannot change a collection''s poems'
);
select throws_ok(
  $$select public.move_my_poem('c0000000-0000-4000-8000-000000000002', null, null, 0)$$,
  'AM001', 'account restricted', 'a blocked user cannot move a poem'
);
select throws_ok(
  $$select public.move_my_collection('c1000000-0000-4000-8000-000000000001', 0)$$,
  'AM001', 'account restricted', 'a blocked user cannot move a collection'
);

select is_empty(
  $$update public.author_profiles set about = 'Hacked' where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' returning id$$,
  'a blocked user''s direct profile update changes no row'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('author-photos', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/c2000000-0000-4000-8000-000000000002.png')$$,
  '42501', null, 'a blocked user cannot upload into their author-photos folder'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('poem-illustrations', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/c3000000-0000-4000-8000-000000000002.png')$$,
  '42501', null, 'a blocked user cannot upload into their poem-illustrations folder'
);
select is_empty(
  $$delete from storage.objects
    where bucket_id = 'author-photos'
      and name = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/c2000000-0000-4000-8000-000000000001.png'
    returning name$$,
  'a blocked user cannot delete their own author photo'
);
select is_empty(
  $$delete from storage.objects
    where bucket_id = 'poem-illustrations'
      and name = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/c3000000-0000-4000-8000-000000000001.png'
    returning name$$,
  'a blocked user cannot delete their own illustration'
);

select isnt_empty(
  $$select 1 from public.poems where author_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  'a blocked user still reads public poems'
);
select isnt_empty(
  $$select 1 from public.author_profiles where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  'a blocked user still reads public profiles'
);

-- ---------- BAN: a banned account is restricted the same way ----------
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);

select throws_ok(
  $$select public.create_my_collection('T', null)$$, 'AM001', 'account restricted',
  'a banned user cannot create a collection'
);

-- ---------- NOP: no profile, not restricted ----------
select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}', true);

select is(public.is_restricted(), false, 'a user with no profile and no restriction is not restricted');

-- ---------- ADM: an admin is not exempt from the tables being closed ----------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(public.is_admin(), true, 'a listed user is an admin');
select throws_ok('select * from public.moderation_log', '42501', null, 'an admin cannot read moderation_log through the API');
select throws_ok('select * from public.admins', '42501', null, 'an admin cannot read admins through the API');

reset role;

-- ---------- Nothing changed for BLK ----------

select is(
  (select count(*)::int from public.poems where author_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  2,
  'the blocked user''s writes stored and deleted no poem'
);
select is(
  (select title from public.poems where id = 'c0000000-0000-4000-8000-000000000002'),
  'Blocked free',
  'the blocked user''s update changed no poem'
);
select is(
  (select count(*)::int from public.collections where author_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  1,
  'the blocked user''s writes created and deleted no collection'
);
select is(
  (select collection_id from public.poems where id = 'c0000000-0000-4000-8000-000000000002'),
  null,
  'the blocked user''s collection save moved no poem'
);
select is_empty(
  $$select 1 from public.write_rate_limits where user_id in
    ('33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444')$$,
  'a refused write consumed no allowance'
);
select is(
  (select about from public.author_profiles where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  null,
  'the blocked user''s profile is unchanged'
);
select is(
  (select count(*)::int from storage.objects where name like 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/%'),
  2,
  'the blocked user''s files were neither added nor removed'
);

-- ---------- BLK is unblocked: writes work again at once (FR-13) ----------

delete from public.account_restrictions where user_id = '33333333-3333-4333-8333-333333333333';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);

select is(public.is_restricted(), false, 'a user just unblocked is no longer restricted');
select is(
  (select public.create_my_poem('Back again', 'Text', null, null) ->> 'status'),
  'created',
  'a user just unblocked stores a poem'
);

reset role;

-- ---------- Function grants (NFR-1) ----------

select is(has_function_privilege('anon', 'public.is_admin()', 'execute'), false, 'anon cannot execute is_admin()');
select is(has_function_privilege('authenticated', 'public.is_admin()', 'execute'), true, 'authenticated can execute is_admin()');
select is(has_function_privilege('anon', 'public.is_restricted()', 'execute'), false, 'anon cannot execute is_restricted()');
select is(has_function_privilege('authenticated', 'public.is_restricted()', 'execute'), true, 'authenticated can execute is_restricted()');

-- ---------- No writer is left unguarded (FR-13) ----------

-- Every volatile security definer function in public that authenticated can execute must call
-- assert_not_restricted() (a `perform` call, so a comment naming it does not count), unless it is on the explicit
-- allowlist below: the volatile admin functions, which check admin instead (admin_functions.test.sql proves each
-- calls assert_admin()). A name pattern would exempt any future `admin_` function by its spelling, so the list
-- names each one. The stable pre-check can_create_poem() is held to the same rule by its own check below.
create temp view unguarded_writers as
  select p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and p.provolatile = 'v'
    and has_function_privilege('authenticated', p.oid, 'execute')
    and p.prosrc !~ 'perform\s+public\.assert_not_restricted\s*\('
    and p.proname <> all (array[
      'admin_block_user', 'admin_unblock_user', 'admin_ban_user',
      'admin_revoke_sessions', 'admin_delete_poem', 'admin_delete_collection'
    ]);

select is_empty('select * from unguarded_writers', 'every writer an authenticated user can execute calls assert_not_restricted()');

select matches(
  (select prosrc from pg_proc where oid = 'public.can_create_poem()'::regprocedure),
  'perform\s+public\.assert_not_restricted\s*\(',
  'can_create_poem() calls assert_not_restricted()'
);

-- The check can fail: a new writer that forgets the guard is found.
create function public.zz_unguarded_writer() returns void
language plpgsql security definer set search_path = '' as $$ begin null; end; $$;
grant execute on function public.zz_unguarded_writer() to authenticated;

select is(
  (select count(*)::int from unguarded_writers where proname = 'zz_unguarded_writer'),
  1,
  'a new unguarded writer is found by the check'
);

select * from finish();
rollback;
