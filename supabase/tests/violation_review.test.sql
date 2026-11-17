-- The violation case table, its guarded functions and the notice data added to block, ban and the admin deletes
-- (admin-violations-feedback, design D2, D3; migration 20261117170000_violation_review.sql).
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(132);

-- Start from empty content tables, so the checks below see only these fixtures and not the local seed. The whole
-- file runs in one transaction that is rolled back, so the seed survives.
delete from public.violation_cases;
delete from public.poems;
delete from public.author_profiles;
delete from public.moderation_log;

-- Fixtures, written as the superuser (bypasses RLS).
--   ADM, ADM2   admins (ADM has a profile)
--   ACT         active author with a poem and a collection
--   OTH         active author with a poem and a collection
--   BLK, BAN    blocked and banned
--   NOP         active, no profile
--   PRO         active, has a profile and no content
--   NOE         active, has a profile and a poem, and no email address
--   RST         active until a test restricts it by hand
--   NOC         active, never gets a case
--   UNK         an id no user has
insert into auth.users (id, email, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'adm@example.test', '2099-01-01 00:00:00+00'),
  ('66666666-6666-4666-8666-666666666666', 'adm2@example.test', '2099-01-02 00:00:00+00'),
  ('22222222-2222-4222-8222-222222222222', 'act@example.test', '2099-01-03 00:00:00+00'),
  ('33333333-3333-4333-8333-333333333333', 'oth@example.test', '2099-01-04 00:00:00+00'),
  ('44444444-4444-4444-8444-444444444444', 'blk@example.test', '2099-01-05 00:00:00+00'),
  ('55555555-5555-4555-8555-555555555555', 'ban@example.test', '2099-01-06 00:00:00+00'),
  ('77777777-7777-4777-8777-777777777777', 'nop@example.test', '2099-01-07 00:00:00+00'),
  ('88888888-8888-4888-8888-888888888888', 'pro@example.test', '2099-01-08 00:00:00+00'),
  ('1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a', 'rst@example.test', '2099-01-10 00:00:00+00'),
  ('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd', 'noc@example.test', '2099-01-11 00:00:00+00');
insert into auth.users (id, created_at) values
  ('99999999-9999-4999-8999-999999999999', '2099-01-09 00:00:00+00');

insert into public.admins (user_id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('66666666-6666-4666-8666-666666666666');

insert into public.author_profiles (id, user_id, first_name, last_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Anna', 'Admin'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Boris', 'Active'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', 'Clara', 'Other'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '88888888-8888-4888-8888-888888888888', 'Dina', 'Profile'),
  ('e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1', '99999999-9999-4999-8999-999999999999', 'Egor', 'Noaddress');

insert into public.collections (id, author_id, title) values
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Act collection'),
  ('c1000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Oth collection');

insert into public.poems (id, author_id, collection_id, title, text, position, illustration_path) values
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, 'Act poem', 'Act text', 0, null),
  ('c0000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', null, 'Oth poem', 'Oth text', 0, null),
  ('e0000000-0000-4000-8000-000000000001', 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1', null, 'Noe poem', 'Noe text', 0, null);

insert into public.account_restrictions (user_id, kind, created_by) values
  ('44444444-4444-4444-8444-444444444444', 'blocked', '11111111-1111-4111-8111-111111111111'),
  ('55555555-5555-4555-8555-555555555555', 'banned', '11111111-1111-4111-8111-111111111111');

-- ---------- The case table: shape, constraints, closed to clients (task 1.1; FR-1, FR-12, NFR-2) ----------
-- implements FR-12 and NFR-2 of admin-violations-feedback

select is(
  (select relrowsecurity from pg_class where oid = 'public.violation_cases'::regclass), true,
  'row level security is on for the case table');
select is_empty(
  $$select 1 from pg_policies where schemaname = 'public' and tablename = 'violation_cases'$$,
  'the case table has no policy');
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'violation_cases' and grantee in ('anon', 'authenticated')),
  0, 'the case table has no grant for anon or authenticated');

-- The check constraints.
select throws_ok(
  $$insert into public.violation_cases (user_id, ground, added_by)
    values ('22222222-2222-4222-8222-222222222222', 'rude', '11111111-1111-4111-8111-111111111111')$$,
  '23514', null, 'a ground outside the two is refused by the table');
select throws_ok(
  $$insert into public.violation_cases (user_id, ground, content_kind, added_by)
    values ('22222222-2222-4222-8222-222222222222', 'harmful-content', 'poem', '11111111-1111-4111-8111-111111111111')$$,
  '23514', null, 'a content kind without a content id is refused by the table');
select throws_ok(
  $$insert into public.violation_cases (user_id, ground, added_by, closed_at)
    values ('22222222-2222-4222-8222-222222222222', 'harmful-content', '11111111-1111-4111-8111-111111111111', now())$$,
  '23514', null, 'a closed time without a way it ended is refused by the table');

-- ---------- What is there, and who can call it (NFR-2) ----------

select is_empty(
  $$select p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('admin_add_violation_case', 'admin_add_violation_case_for_author',
        'admin_list_violation_cases', 'admin_set_case_ground', 'admin_remove_violation_case',
        'admin_start_warning', 'admin_mark_warned', 'admin_log_notice')
      and (
        not p.prosecdef
        or p.proconfig is null
        or not ('search_path=""' = any (p.proconfig))
        or p.prosrc !~ 'perform\s+public\.assert_admin\s*\('
      )$$,
  'every new admin function is security definer, has an empty search_path and calls assert_admin()');

select is(
  (select count(*)::int from unnest(array[
      'public.admin_add_violation_case(uuid, text, text, uuid)',
      'public.admin_add_violation_case_for_author(uuid, text, text, uuid)',
      'public.admin_list_violation_cases()', 'public.admin_set_case_ground(uuid, text)',
      'public.admin_remove_violation_case(uuid)', 'public.admin_start_warning(uuid)',
      'public.admin_mark_warned(uuid)', 'public.admin_log_notice(uuid, text, text)'
    ]) f
    where has_function_privilege('authenticated', f, 'execute')
      and not has_function_privilege('anon', f, 'execute')
      and not has_function_privilege('public', f, 'execute')),
  8, 'the new admin functions are executable by authenticated only');

select is(
  (select count(*)::int from unnest(array['public.add_violation_case_of(uuid, text, text, uuid)']) f
    where not has_function_privilege('authenticated', f, 'execute')
      and not has_function_privilege('anon', f, 'execute')
      and not has_function_privilege('public', f, 'execute')),
  1, 'the shared add body is executable by no client role');

select is(
  (select prorettype::regtype::text from pg_proc where oid = 'public.apply_restriction(uuid, text)'::regprocedure),
  'void', 'apply_restriction still returns void');

-- ---------- anon: every function refused (NFR-2) ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$select public.admin_add_violation_case('22222222-2222-4222-8222-222222222222', 'harmful-content', null, null)$$,
  '42501', null, 'anon cannot add a case');
select throws_ok($$select public.admin_add_violation_case_for_author('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'harmful-content', null, null)$$,
  '42501', null, 'anon cannot add a case for an author');
select throws_ok($$select * from public.admin_list_violation_cases()$$, '42501', null, 'anon cannot list cases');
select throws_ok($$select public.admin_set_case_ground('b2000000-0000-4000-8000-000000000001', 'harmful-content')$$,
  '42501', null, 'anon cannot switch a ground');
select throws_ok($$select public.admin_remove_violation_case('b2000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon cannot remove a case');
select throws_ok($$select public.admin_start_warning('b2000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon cannot start a warning');
select throws_ok($$select public.admin_mark_warned('b2000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon cannot mark a case warned');
select throws_ok($$select public.admin_log_notice('22222222-2222-4222-8222-222222222222', 'block', 'sent')$$,
  '42501', null, 'anon cannot log a notice');
select throws_ok($$select * from public.violation_cases$$, '42501', null, 'anon cannot read the case table');

-- ---------- ACT: a signed-in non-admin ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select throws_ok($$select public.admin_add_violation_case('33333333-3333-4333-8333-333333333333', 'harmful-content', null, null)$$,
  '42501', 'not an admin', 'a non-admin cannot add a case');
select throws_ok($$select public.admin_add_violation_case_for_author('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'harmful-content', null, null)$$,
  '42501', 'not an admin', 'a non-admin cannot add a case for an author');
select throws_ok($$select * from public.admin_list_violation_cases()$$, '42501', 'not an admin', 'a non-admin cannot list cases');
select throws_ok($$select public.admin_set_case_ground('b2000000-0000-4000-8000-000000000001', 'harmful-content')$$,
  '42501', 'not an admin', 'a non-admin cannot switch a ground');
select throws_ok($$select public.admin_remove_violation_case('b2000000-0000-4000-8000-000000000001')$$,
  '42501', 'not an admin', 'a non-admin cannot remove a case');
select throws_ok($$select public.admin_start_warning('b2000000-0000-4000-8000-000000000001')$$,
  '42501', 'not an admin', 'a non-admin cannot start a warning');
select throws_ok($$select public.admin_mark_warned('b2000000-0000-4000-8000-000000000001')$$,
  '42501', 'not an admin', 'a non-admin cannot mark a case warned');
select throws_ok($$select public.admin_log_notice('22222222-2222-4222-8222-222222222222', 'block', 'sent')$$,
  '42501', 'not an admin', 'a non-admin cannot log a notice');
select throws_ok(
  $$select public.add_violation_case_of('33333333-3333-4333-8333-333333333333', 'harmful-content', null, null)$$,
  '42501', null, 'a signed-in user cannot call the shared add body');
select throws_ok($$select * from public.violation_cases$$, '42501', null, 'a signed-in user cannot read the case table');

reset role;
select is((select count(*)::int from public.violation_cases), 0, 'the refused calls created no case');
select is((select count(*)::int from public.moderation_log), 0, 'the refused calls wrote no log row');

-- ---------- ADM: add a case (task 1.2; FR-1) ----------
-- implements FR-1 of admin-violations-feedback
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  public.admin_add_violation_case('22222222-2222-4222-8222-222222222222', 'harmful-content', null, null) ->> 'status',
  'added', 'an admin adds a user with a ground');
select is(
  public.admin_add_violation_case('22222222-2222-4222-8222-222222222222', 'malicious-activity', null, null) ->> 'status',
  'already-in-list', 'adding a user who has an open case answers already-in-list');
select is(
  public.admin_add_violation_case('33333333-3333-4333-8333-333333333333', 'malicious-activity', 'poem',
    'c0000000-0000-4000-8000-000000000001') ->> 'status',
  'added', 'an admin adds a user with the poem that prompted it');
select is(
  public.admin_add_violation_case('66666666-6666-4666-8666-666666666666', 'harmful-content', null, null) ->> 'status',
  'target-is-admin', 'another admin cannot be added');
select is(
  public.admin_add_violation_case('11111111-1111-4111-8111-111111111111', 'harmful-content', null, null) ->> 'status',
  'target-is-admin', 'the calling admin cannot be added');
select is(
  public.admin_add_violation_case('44444444-4444-4444-8444-444444444444', 'harmful-content', null, null) ->> 'status',
  'already-restricted', 'a blocked user cannot be added');
select is(
  public.admin_add_violation_case('55555555-5555-4555-8555-555555555555', 'harmful-content', null, null) ->> 'status',
  'already-restricted', 'a banned user cannot be added');
select is(
  public.admin_add_violation_case('ffffffff-ffff-4fff-8fff-ffffffffffff', 'harmful-content', null, null) ->> 'status',
  'not-found', 'an unknown user answers not-found');
select is(
  public.admin_add_violation_case('77777777-7777-4777-8777-777777777777', 'harmful-content', 'poem',
    'b0000000-0000-4000-8000-000000000001') ->> 'status',
  'content-not-found', 'another user''s poem cannot be attached');
select is(
  public.admin_add_violation_case('77777777-7777-4777-8777-777777777777', 'harmful-content', 'collection',
    'b1000000-0000-4000-8000-000000000001') ->> 'status',
  'content-not-found', 'another user''s collection cannot be attached');
select is(
  public.admin_add_violation_case('77777777-7777-4777-8777-777777777777', 'harmful-content', 'poem',
    'ffffffff-ffff-4fff-8fff-ffffffffffff') ->> 'status',
  'content-not-found', 'a poem that no longer exists cannot be attached');
select throws_ok(
  $$select public.admin_add_violation_case('77777777-7777-4777-8777-777777777777', 'rude', null, null)$$,
  '22023', null, 'a ground outside the two is refused');
select throws_ok(
  $$select public.admin_add_violation_case('77777777-7777-4777-8777-777777777777', 'harmful-content', 'poem', null)$$,
  '22023', null, 'a content kind without an id is refused');
select throws_ok(
  $$select public.admin_add_violation_case('77777777-7777-4777-8777-777777777777', 'harmful-content', 'comment',
    'b0000000-0000-4000-8000-000000000001')$$,
  '22023', null, 'a content kind outside poem and collection is refused');

-- The form for the public pages, which know a profile id.
select is(
  public.admin_add_violation_case_for_author('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'malicious-activity', null, null) ->> 'status',
  'added', 'an admin adds an author by profile id');
select is(
  public.admin_add_violation_case_for_author('99999999-0000-4000-8000-000000000000', 'harmful-content', null, null) ->> 'status',
  'not-found', 'an unknown profile answers not-found');
select is(
  public.admin_add_violation_case_for_author('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'harmful-content', null, null) ->> 'status',
  'target-is-admin', 'an admin''s own profile cannot be added');
select is(
  public.admin_add_violation_case_for_author('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'harmful-content', null, null) ->> 'status',
  'already-in-list', 'an author who has an open case answers already-in-list');
select is(
  public.admin_add_violation_case_for_author('e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1', 'harmful-content', 'poem',
    'b0000000-0000-4000-8000-000000000001') ->> 'status',
  'content-not-found', 'another author''s poem cannot be attached through a profile id either');

-- Closed to clients, the admin included: only the functions above write the table (FR-12).
select throws_ok(
  $$insert into public.violation_cases (user_id, ground, added_by)
    values ('44444444-4444-4444-8444-444444444444', 'harmful-content', '11111111-1111-4111-8111-111111111111')$$,
  '42501', null, 'an admin cannot insert into the case table through the API');
select throws_ok(
  $$update public.violation_cases set ground = 'harmful-content'$$,
  '42501', null, 'an admin cannot update the case table through the API');

reset role;

select is(
  (select ground || '/' || coalesce(content_kind, '-') || '/' || (warned_at is null) || '/' || (closed_at is null)
          || '/' || added_by
   from public.violation_cases where user_id = '22222222-2222-4222-8222-222222222222'),
  'harmful-content/-/true/true/11111111-1111-4111-8111-111111111111',
  'the case holds the ground, no content, no warning, is open, and names the admin');
select is(
  (select ground || '/' || content_kind || '/' || content_id
   from public.violation_cases where user_id = '33333333-3333-4333-8333-333333333333'),
  'malicious-activity/poem/c0000000-0000-4000-8000-000000000001',
  'the case records the poem that prompted it');
select is(
  (select count(*)::int from public.violation_cases
    where user_id in ('11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777', '44444444-4444-4444-8444-444444444444',
      '55555555-5555-4555-8555-555555555555', '99999999-9999-4999-8999-999999999999')),
  0, 'no refused call created a case');
select is(
  (select count(*)::int from public.violation_cases where user_id = '22222222-2222-4222-8222-222222222222'),
  1, 'adding twice left one case');
select is((select count(*)::int from public.moderation_log), 3,
  'only the three successful adds were logged, and no no-op wrote a row');
select is(
  (select m.action || '/' || m.target_kind || '/' || m.admin_id || '/' || m.target_user_id || '/' || (m.target_id = vc.id)
   from public.moderation_log m
   join public.violation_cases vc on vc.user_id = m.target_user_id
   where m.target_user_id = '22222222-2222-4222-8222-222222222222'),
  'add-violation-case/case/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/true',
  'the log row names the admin, the action, the user and the case');

-- The partial unique index settles two open cases for one user; a closed one is allowed beside the open one.
select throws_ok(
  $$insert into public.violation_cases (user_id, ground, added_by)
    values ('22222222-2222-4222-8222-222222222222', 'harmful-content', '11111111-1111-4111-8111-111111111111')$$,
  '23505', null, 'a second open case for one user is refused by the unique index');
select lives_ok(
  $$insert into public.violation_cases (user_id, ground, added_by, closed_at, closed_as)
    values ('22222222-2222-4222-8222-222222222222', 'harmful-content', '11111111-1111-4111-8111-111111111111', now(), 'removed')$$,
  'a closed case can sit beside the open one');
delete from public.violation_cases where user_id = '22222222-2222-4222-8222-222222222222' and closed_at is not null;

-- ---------- The list (task 1.3; FR-4) ----------
-- implements FR-4 of admin-violations-feedback
-- now() is the same for the whole transaction, so the order below is set by hand.
update public.violation_cases set created_at = case user_id
    when '22222222-2222-4222-8222-222222222222' then '2099-02-01 00:00:00+00'::timestamptz
    when '33333333-3333-4333-8333-333333333333' then '2099-03-01 00:00:00+00'::timestamptz
    when '88888888-8888-4888-8888-888888888888' then '2099-02-15 00:00:00+00'::timestamptz
  end
  where user_id in ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333',
    '88888888-8888-4888-8888-888888888888');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  array(select user_id from public.admin_list_violation_cases()),
  array['33333333-3333-4333-8333-333333333333', '88888888-8888-4888-8888-888888888888',
    '22222222-2222-4222-8222-222222222222']::uuid[],
  'the list holds the open cases, newest first');
select is(
  (select user_email || '/' || author_name || '/' || author_profile_id || '/' || ground || '/' || content_kind
          || '/' || content_title
   from public.admin_list_violation_cases() where user_id = '33333333-3333-4333-8333-333333333333'),
  'oth@example.test/Clara Other/cccccccc-cccc-4ccc-8ccc-cccccccccccc/malicious-activity/poem/Oth poem',
  'a row carries the address, author name, profile id, ground and the title of the prompting poem');

select is(
  public.admin_add_violation_case('77777777-7777-4777-8777-777777777777', 'malicious-activity', null, null) ->> 'status',
  'added', 'an admin adds a user who has no author profile');

reset role;
update public.violation_cases set created_at = '2099-01-15 00:00:00+00'
  where user_id = '77777777-7777-4777-8777-777777777777';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  (select user_email || '/' || coalesce(author_name, '-') || '/' || coalesce(author_profile_id::text, '-') || '/'
          || coalesce(content_kind, '-') || '/' || coalesce(content_title, '-')
   from public.admin_list_violation_cases() where user_id = '77777777-7777-4777-8777-777777777777'),
  'nop@example.test/-/-/-/-',
  'a user with no profile and no recorded content has no author name, profile id or title');

reset role;
delete from public.poems where id = 'c0000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  (select coalesce(content_title, '-') || '/' || content_id
   from public.admin_list_violation_cases() where user_id = '33333333-3333-4333-8333-333333333333'),
  '-/c0000000-0000-4000-8000-000000000001',
  'a deleted poem keeps its id in the list and has no title');

-- The cap: the function returns one row more than the 100 the page shows, so the page can tell "more exist" from
-- "exactly 100" (design D3).
reset role;
insert into auth.users (id, email, created_at)
  select gen_random_uuid(), 'bulk' || g || '@example.test', '2100-01-01 00:00:00+00'::timestamptz + g * interval '1 minute'
  from generate_series(1, 101) g;
insert into public.violation_cases (user_id, ground, added_by, created_at)
  select u.id, 'malicious-activity', '11111111-1111-4111-8111-111111111111', u.created_at
  from auth.users u where u.email like 'bulk%@example.test';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is((select count(*)::int from public.admin_list_violation_cases()), 101,
  'with more than 100 open cases the list returns 101 rows, one more than the page shows');
select is(
  (select user_email from public.admin_list_violation_cases() limit 1), 'bulk101@example.test',
  'the first row is the newest case');

reset role;
delete from auth.users where email like 'bulk%@example.test';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is((select count(*)::int from public.admin_list_violation_cases()), 4,
  'the list holds the four real open cases once the bulk ones are gone');

-- ---------- The warning (task 1.3; FR-6, FR-11) ----------
-- implements FR-6 and FR-11 of admin-violations-feedback
reset role;
select set_config('test.act_case', (select id::text from public.violation_cases where user_id = '22222222-2222-4222-8222-222222222222'), true);
select set_config('test.pro_case', (select id::text from public.violation_cases where user_id = '88888888-8888-4888-8888-888888888888'), true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  public.admin_start_warning(current_setting('test.act_case')::uuid),
  '{"status": "ready", "email": "act@example.test"}'::jsonb,
  'starting a warning on a harmful-content case with no warning is ready, with the address');
select is(public.admin_mark_warned(current_setting('test.act_case')::uuid) ->> 'status', 'warned',
  'marking an open case warned records it');
select is(public.admin_mark_warned(current_setting('test.act_case')::uuid) ->> 'status', 'already-warned',
  'marking it again answers already-warned');
select is(public.admin_start_warning(current_setting('test.act_case')::uuid) ->> 'status', 'already-warned',
  'starting a warning on a warned case answers already-warned');

reset role;
select is((select warned_at is not null from public.violation_cases where user_id = '22222222-2222-4222-8222-222222222222'),
  true, 'the case holds the time of the warning');
select is((select count(*)::int from public.moderation_log where action = 'warn-violation-case'), 1,
  'the warning was logged once, and neither the second mark nor the starts wrote a row');
create temp table warned_before as
  select warned_at from public.violation_cases where user_id = '22222222-2222-4222-8222-222222222222';

-- Switching the ground changes only the ground (FR-7).
-- implements FR-7 of admin-violations-feedback
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(public.admin_set_case_ground(current_setting('test.act_case')::uuid, 'malicious-activity') ->> 'status',
  'ground-changed', 'an admin switches a case to the other ground');
select is(public.admin_start_warning(current_setting('test.act_case')::uuid) ->> 'status', 'wrong-ground',
  'a malicious-activity case answers wrong-ground to a warning');
select is(public.admin_set_case_ground(current_setting('test.act_case')::uuid, 'harmful-content') ->> 'status',
  'ground-changed', 'an admin switches it back');
select is(public.admin_start_warning(current_setting('test.act_case')::uuid) ->> 'status', 'already-warned',
  'switched back, the case is still warned and offers no second warning');
select is(public.admin_set_case_ground(current_setting('test.act_case')::uuid, 'harmful-content') ->> 'status',
  'ground-changed', 'switching to the ground it already has answers ground-changed');
select throws_ok(
  $$select public.admin_set_case_ground(current_setting('test.act_case')::uuid, 'rude')$$,
  '22023', null, 'a ground outside the two is refused');
select is(public.admin_set_case_ground('b2000000-0000-4000-8000-000000000001', 'harmful-content') ->> 'status',
  'not-found', 'switching an unknown case answers not-found');

reset role;
select is(
  (select warned_at from public.violation_cases where user_id = '22222222-2222-4222-8222-222222222222'),
  (select warned_at from warned_before),
  'switching away and back left the time of the warning unchanged');
select is((select count(*)::int from public.moderation_log where action = 'set-case-ground'), 2,
  'the two switches were logged and the call that changed nothing was not');

-- The other answers of the warning checks.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(public.admin_start_warning(current_setting('test.pro_case')::uuid) ->> 'status', 'wrong-ground',
  'a case that was added as malicious-activity answers wrong-ground');
select is(
  public.admin_add_violation_case('99999999-9999-4999-8999-999999999999', 'harmful-content', null, null) ->> 'status',
  'added', 'an admin adds a user who has no email address');
select is(
  public.admin_start_warning((select id from public.admin_list_violation_cases()
    where user_id = '99999999-9999-4999-8999-999999999999')) ->> 'status',
  'no-address', 'a user with no address answers no-address');
select is(
  public.admin_add_violation_case('1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a', 'harmful-content', null, null) ->> 'status',
  'added', 'an admin adds a user who is restricted by hand a moment later');

reset role;
insert into public.account_restrictions (user_id, kind, created_by) values
  ('1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a', 'blocked', '11111111-1111-4111-8111-111111111111');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  public.admin_start_warning((select id from public.admin_list_violation_cases()
    where user_id = '1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a')) ->> 'status',
  'already-restricted', 'a blocked user answers already-restricted');

-- ---------- Removing a case (task 1.3; FR-7) ----------
select is(public.admin_remove_violation_case(current_setting('test.pro_case')::uuid) ->> 'status', 'removed',
  'an admin removes an open case');
select is(public.admin_remove_violation_case(current_setting('test.pro_case')::uuid) ->> 'status', 'not-found',
  'removing it again answers not-found');
select is(public.admin_set_case_ground(current_setting('test.pro_case')::uuid, 'harmful-content') ->> 'status',
  'not-found', 'switching a removed case answers not-found');
select is(public.admin_start_warning(current_setting('test.pro_case')::uuid) ->> 'status', 'not-found',
  'starting a warning on a removed case answers not-found');
select is(public.admin_mark_warned(current_setting('test.pro_case')::uuid) ->> 'status', 'not-found',
  'marking a removed case warned answers not-found');
select is((select count(*)::int from public.admin_list_violation_cases() where user_id = '88888888-8888-4888-8888-888888888888'),
  0, 'a removed case is not in the list');

reset role;
select is(
  (select closed_as || '/' || (closed_at is not null) || '/' || (warned_at is null)
   from public.violation_cases where id = current_setting('test.pro_case')::uuid),
  'removed/true/true', 'the removed case is closed as removed and was never warned by the refused mark');
select is((select count(*)::int from public.account_restrictions where user_id = '88888888-8888-4888-8888-888888888888'),
  0, 'removing a case restricted nobody');
select is((select count(*)::int from public.moderation_log where action = 'remove-violation-case'), 1,
  'the removal was logged once and the refused calls were not');

-- A removed case can be reopened.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is(
  public.admin_add_violation_case('88888888-8888-4888-8888-888888888888', 'malicious-activity', null, null) ->> 'status',
  'added', 'a user whose case was removed can be added again');

reset role;
select is(
  (select count(*)::int || '/' || count(*) filter (where closed_at is null and warned_at is null)::int
   from public.violation_cases where user_id = '88888888-8888-4888-8888-888888888888'),
  '2/1', 'the user has the removed case and a new open case with no warning');

-- ---------- Block and ban close the case and carry the notice data (task 1.4; FR-9, FR-10) ----------
-- implements FR-9 and FR-10 of admin-violations-feedback, FR-4 and FR-5 of admin-moderation
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  public.admin_block_user('33333333-3333-4333-8333-333333333333'),
  '{"status": "blocked", "notice_email": "oth@example.test", "ground": "malicious-activity"}'::jsonb,
  'a block answers with the address and the ground of the open case');
select is(
  public.admin_block_user('33333333-3333-4333-8333-333333333333'),
  '{"status": "already-restricted"}'::jsonb,
  'a block that changes nothing carries no notice data');
select is(
  public.admin_ban_user('77777777-7777-4777-8777-777777777777'),
  '{"status": "banned", "notice_email": "nop@example.test", "ground": "malicious-activity"}'::jsonb,
  'a ban answers with the address and the ground of the open case');
select is(
  public.admin_block_user('cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd'),
  '{"status": "blocked", "notice_email": "noc@example.test", "ground": null}'::jsonb,
  'a user with no case is blocked as before, with a null ground');
select is(
  public.admin_ban_user('44444444-4444-4444-8444-444444444444'),
  '{"status": "banned", "notice_email": "blk@example.test", "ground": null}'::jsonb,
  'banning a blocked user with no case gives a null ground');
select is(
  public.admin_block_user('99999999-9999-4999-8999-999999999999'),
  '{"status": "blocked", "notice_email": null, "ground": "harmful-content"}'::jsonb,
  'an account with no address is blocked and the answer holds a null address');
select is(
  public.admin_block_user('88888888-8888-4888-8888-888888888888'),
  '{"status": "blocked", "notice_email": "pro@example.test", "ground": "malicious-activity"}'::jsonb,
  'the ground comes from the open case, not from the removed one');
select is(
  public.admin_ban_user('1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a'),
  '{"status": "banned", "notice_email": "rst@example.test", "ground": "harmful-content"}'::jsonb,
  'banning a blocked user who has an open case closes it and answers with its ground');
select is(
  array(select user_id from public.admin_list_violation_cases()),
  array['22222222-2222-4222-8222-222222222222']::uuid[],
  'only the case of the user nobody restricted is left in the list');

reset role;
select is(
  (select closed_as from public.violation_cases where user_id = '33333333-3333-4333-8333-333333333333'),
  'blocked', 'a block closes the open case as blocked');
select is(
  (select closed_as from public.violation_cases where user_id = '77777777-7777-4777-8777-777777777777'),
  'banned', 'a ban closes the open case as banned');
select is(
  (select closed_as from public.violation_cases where user_id = '99999999-9999-4999-8999-999999999999'),
  'blocked', 'a block closes the case of an account with no address');
select is(
  (select closed_as from public.violation_cases where user_id = '1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a'),
  'banned', 'a ban of a blocked user closes the open case as banned');
select is(
  array(select closed_as from public.violation_cases where user_id = '88888888-8888-4888-8888-888888888888' order by closed_as),
  array['blocked', 'removed'],
  'the block closed only the open case and left the removed one as it was');
select is((select count(*)::int from public.violation_cases where user_id = 'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd'),
  0, 'a user with no case is restricted and nothing else changes');
select is(
  (select count(*)::int from public.violation_cases where closed_at is null),
  1, 'the other users'' open case was left open');
select is((select kind from public.account_restrictions where user_id = '33333333-3333-4333-8333-333333333333'),
  'blocked', 'the block keeps its existing effect');
select is((select kind from public.account_restrictions where user_id = '77777777-7777-4777-8777-777777777777'),
  'banned', 'the ban keeps its existing effect');

-- ---------- The admin deletes carry the notice data (task 1.4; FR-9) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  public.admin_delete_poem('b0000000-0000-4000-8000-000000000001'),
  '{"status": "deleted", "author_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "illustration_path": null, "title": "Act poem", "user_id": "22222222-2222-4222-8222-222222222222", "notice_email": "act@example.test", "ground": "harmful-content"}'::jsonb,
  'a poem delete answers with the title, the author''s user id, the address and the ground of the open case');
select is(
  public.admin_delete_collection('b1000000-0000-4000-8000-000000000001'),
  '{"status": "deleted", "title": "Act collection", "author_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "user_id": "22222222-2222-4222-8222-222222222222", "notice_email": "act@example.test", "ground": "harmful-content"}'::jsonb,
  'a collection delete answers with the author''s user id, the address and the ground of the open case');
select is(
  public.admin_delete_poem('e0000000-0000-4000-8000-000000000001'),
  '{"status": "deleted", "author_id": "e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1", "illustration_path": null, "title": "Noe poem", "user_id": "99999999-9999-4999-8999-999999999999", "notice_email": null, "ground": null}'::jsonb,
  'a delete of a poem by an author with no address and no open case answers with nulls');
select is(
  public.admin_delete_collection('c1000000-0000-4000-8000-000000000001'),
  '{"status": "deleted", "title": "Oth collection", "author_id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "user_id": "33333333-3333-4333-8333-333333333333", "notice_email": "oth@example.test", "ground": null}'::jsonb,
  'a delete of a collection whose author''s case is closed answers with a null ground');

reset role;
select is(
  (select count(*)::int from public.violation_cases
    where user_id = '22222222-2222-4222-8222-222222222222' and closed_at is null),
  1, 'deleting content does not close the case');

-- ---------- The notice outcome (task 1.4; FR-12) ----------
-- implements FR-12 of admin-violations-feedback
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$select public.admin_log_notice('22222222-2222-4222-8222-222222222222', 'block', 'sent')$$,
  'an admin logs a notice that was sent');
select lives_ok(
  $$select public.admin_log_notice('22222222-2222-4222-8222-222222222222', 'delete-poem', 'failed')$$,
  'an admin logs a notice that failed');
select throws_ok(
  $$select public.admin_log_notice('22222222-2222-4222-8222-222222222222', 'someone@example.test', 'sent')$$,
  '22023', null, 'a kind outside the four is refused, so an address cannot reach the log');
select throws_ok(
  $$select public.admin_log_notice('22222222-2222-4222-8222-222222222222', 'block', 'Dear user')$$,
  '22023', null, 'an outcome outside sent and failed is refused, so text cannot reach the log');
select throws_ok(
  $$select public.admin_log_notice(null, 'block', 'sent')$$,
  '22023', null, 'a missing user is refused');

reset role;
select is(
  array(select action || '/' || target_kind || '/' || target_user_id || '/' || target_id
        from public.moderation_log where action like 'notice-%' order by action),
  array[
    'notice-failed/delete-poem/22222222-2222-4222-8222-222222222222/22222222-2222-4222-8222-222222222222',
    'notice-sent/block/22222222-2222-4222-8222-222222222222/22222222-2222-4222-8222-222222222222'
  ],
  'each notice row keeps the kind of the action and the user, and the refused calls wrote none');

-- ---------- The log ----------
select is(
  (select count(*)::int from public.moderation_log m
    where m::text ~* '@|example|Act poem|Oth poem|Noe poem|Act coll|Oth coll|Boris|Egor'), 0,
  'no log row holds an address, a title or a name');
select is((select count(*)::int from public.moderation_log), 24,
  'the whole run wrote 24 rows: seven adds, two switches, one warning, one removal, four blocks, three bans, '
  'four deletes and two notices, and no call that changed nothing wrote one');

-- A deleted account: its case goes with it, the log rows stay (FR-12).
delete from auth.users where id = '22222222-2222-4222-8222-222222222222';
select is((select count(*)::int from public.violation_cases where user_id = '22222222-2222-4222-8222-222222222222'),
  0, 'the open case went with the account');
select isnt((select count(*)::int from public.moderation_log where target_user_id = '22222222-2222-4222-8222-222222222222'),
  0, 'the log rows stay after the account is deleted');

select * from finish();
rollback;
