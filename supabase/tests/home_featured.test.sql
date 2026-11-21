-- The admin's choice for the home page: two closed tables, the guarded functions, the admin's list and the public
-- read of the chosen ids (home-page-sections, design D1 to D3; migration 20261121140000_home_featured.sql).
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(115);

-- Start from empty content tables, so the checks below see only these fixtures and not the local seed. The whole
-- file runs in one transaction that is rolled back, so the seed survives.
delete from public.poems;
delete from public.author_profiles;

-- Fixtures, written as the superuser (bypasses RLS).
--   ADM   admin
--   U2..U6 five public authors (profiles B, C, D, E, F); U2 is also the signed-in non-admin
--   U7    an author whose profile has no name, so it is not public (profile N)
insert into auth.users (id, email, created_at) values
  ('11111111-1111-4111-8111-111111111111', 'adm@example.test', '2099-01-01 00:00:00+00'),
  ('22222222-2222-4222-8222-222222222222', 'u2@example.test', '2099-01-02 00:00:00+00'),
  ('33333333-3333-4333-8333-333333333333', 'u3@example.test', '2099-01-03 00:00:00+00'),
  ('44444444-4444-4444-8444-444444444444', 'u4@example.test', '2099-01-04 00:00:00+00'),
  ('55555555-5555-4555-8555-555555555555', 'u5@example.test', '2099-01-05 00:00:00+00'),
  ('66666666-6666-4666-8666-666666666666', 'u6@example.test', '2099-01-06 00:00:00+00'),
  ('77777777-7777-4777-8777-777777777777', 'u7@example.test', '2099-01-07 00:00:00+00');

insert into public.admins (user_id) values ('11111111-1111-4111-8111-111111111111');

insert into public.author_profiles (id, user_id, first_name, last_name) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Boris', 'Active'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '33333333-3333-4333-8333-333333333333', 'Clara', 'Other'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', 'Dina', 'Third'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '55555555-5555-4555-8555-555555555555', 'Egor', 'Fourth'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', '66666666-6666-4666-8666-666666666666', 'Fedor', 'Fifth'),
  ('a7a7a7a7-a7a7-47a7-87a7-a7a7a7a7a7a7', '77777777-7777-4777-8777-777777777777', null, null);

-- Poems P1 to P5 are Boris's, P6 is Clara's, P7 is Dina's, PN belongs to the author who is not public.
insert into public.poems (id, author_id, title, text) values
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'P1', 'Text'),
  ('b0000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'P2', 'Text'),
  ('b0000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'P3', 'Text'),
  ('b0000000-0000-4000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'P4', 'Text'),
  ('b0000000-0000-4000-8000-000000000005', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'P5', 'Text'),
  ('c0000000-0000-4000-8000-000000000006', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'P6', 'Text'),
  ('d0000000-0000-4000-8000-000000000007', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'P7', 'Text'),
  ('a0000000-0000-4000-8000-0000000000aa', 'a7a7a7a7-a7a7-47a7-87a7-a7a7a7a7a7a7', 'PN', 'Text');

-- ---------- The tables: shape, constraints, closed to clients (task 1.2; FR-10, NFR-6) ----------
-- implements FR-10 of home-page-sections

select is(
  (select count(*)::int from pg_class
    where oid in ('public.home_featured_poems'::regclass, 'public.home_featured_authors'::regclass) and relrowsecurity),
  2, 'row level security is on for both tables');
select is_empty(
  $$select 1 from pg_policies where schemaname = 'public' and tablename in ('home_featured_poems', 'home_featured_authors')$$,
  'neither table has a policy');
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and table_name in ('home_featured_poems', 'home_featured_authors')
      and grantee in ('anon', 'authenticated')),
  0, 'neither table has a grant for anon or authenticated');

-- The cap and the uniqueness are the database's own rules. The unique position is deferred, so it is switched to
-- immediate here to see it fail inside the transaction.
select throws_ok(
  $$insert into public.home_featured_poems (poem_id, position) values ('b0000000-0000-4000-8000-000000000001', 0)$$,
  '23514', null, 'a position below 1 is refused by the table');
select throws_ok(
  $$insert into public.home_featured_poems (poem_id, position) values ('b0000000-0000-4000-8000-000000000001', 5)$$,
  '23514', null, 'a position above 4 is refused by the table');
select throws_ok(
  $$insert into public.home_featured_authors (author_id, position) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 5)$$,
  '23514', null, 'an author position above 4 is refused by the table');

set constraints all immediate;
insert into public.home_featured_poems (poem_id, position) values ('b0000000-0000-4000-8000-000000000001', 1);
select throws_ok(
  $$insert into public.home_featured_poems (poem_id, position) values ('b0000000-0000-4000-8000-000000000002', 1)$$,
  '23505', null, 'two poems at one position are refused by the table');
select throws_ok(
  $$insert into public.home_featured_poems (poem_id, position) values ('b0000000-0000-4000-8000-000000000001', 2)$$,
  '23505', null, 'one poem twice is refused by the table');
delete from public.home_featured_poems;

-- A deleted poem or profile takes its entry with it.
insert into public.home_featured_poems (poem_id, position) values ('a0000000-0000-4000-8000-0000000000aa', 1);
insert into public.home_featured_authors (author_id, position) values ('a7a7a7a7-a7a7-47a7-87a7-a7a7a7a7a7a7', 1);
delete from public.poems where id = 'a0000000-0000-4000-8000-0000000000aa';
select is((select count(*)::int from public.home_featured_poems), 0, 'deleting a poem removes its entry');
delete from public.author_profiles where id = 'a7a7a7a7-a7a7-47a7-87a7-a7a7a7a7a7a7';
select is((select count(*)::int from public.home_featured_authors), 0, 'deleting a profile removes its entry');

-- ---------- What is there, and who can call it (NFR-6) ----------

select is_empty(
  $$select p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('admin_add_home_poem', 'admin_add_home_author', 'admin_move_home_entry',
        'admin_remove_home_entry', 'admin_list_home_entries')
      and (
        not p.prosecdef
        or p.proconfig is null
        or not ('search_path=""' = any (p.proconfig))
        or p.prosrc !~ 'perform\s+public\.assert_admin\s*\('
      )$$,
  'every new admin function is security definer, has an empty search_path and calls assert_admin()');

select is(
  (select count(*)::int from unnest(array[
      'public.admin_add_home_poem(uuid)', 'public.admin_add_home_author(uuid)',
      'public.admin_move_home_entry(text, uuid, integer, integer)', 'public.admin_remove_home_entry(text, uuid)',
      'public.admin_list_home_entries()'
    ]) f
    where has_function_privilege('authenticated', f, 'execute')
      and not has_function_privilege('anon', f, 'execute')
      and not has_function_privilege('public', f, 'execute')),
  5, 'the new admin functions are executable by authenticated only');

select is(
  (select count(*)::int from unnest(array[
      'public.compact_home_featured_poems()', 'public.compact_home_featured_authors()'
    ]) f
    where not has_function_privilege('authenticated', f, 'execute')
      and not has_function_privilege('anon', f, 'execute')
      and not has_function_privilege('public', f, 'execute')),
  2, 'the compaction bodies are executable by no client role');

select is(
  (select count(*)::int from unnest(array['public.home_featured_ids()']) f
    where has_function_privilege('authenticated', f, 'execute')
      and has_function_privilege('anon', f, 'execute')
      and not has_function_privilege('public', f, 'execute')),
  1, 'home_featured_ids is executable by anon and authenticated');

select is(
  (select p.provolatile::text || '/' || p.prosecdef::text || '/' || (p.proconfig @> array['search_path=""'])::text
   from pg_proc p where p.oid = 'public.home_featured_ids()'::regprocedure),
  's/true/true', 'home_featured_ids is stable, security definer and has an empty search_path');
select is(
  (select p.provolatile::text from pg_proc p where p.oid = 'public.admin_list_home_entries()'::regprocedure),
  's', 'the admin list is stable, a read');

-- ---------- anon: every guarded function refused ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$select public.admin_add_home_poem('b0000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon cannot add a poem');
select throws_ok($$select public.admin_add_home_author('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', null, 'anon cannot add an author');
select throws_ok($$select public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000001', 1, 2)$$,
  '42501', null, 'anon cannot move an entry');
select throws_ok($$select public.admin_remove_home_entry('poem', 'b0000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'anon cannot remove an entry');
select throws_ok($$select * from public.admin_list_home_entries()$$, '42501', null, 'anon cannot list the entries');
select throws_ok($$select * from public.home_featured_poems$$, '42501', null, 'anon cannot read the poem table');
select throws_ok($$select * from public.home_featured_authors$$, '42501', null, 'anon cannot read the author table');
select lives_ok($$select public.home_featured_ids()$$, 'anon can read the chosen ids');

-- ---------- U2: a signed-in non-admin ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select throws_ok($$select public.admin_add_home_poem('b0000000-0000-4000-8000-000000000001')$$,
  '42501', 'not an admin', 'a non-admin cannot add a poem');
select throws_ok($$select public.admin_add_home_author('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', 'not an admin', 'a non-admin cannot add an author');
select throws_ok($$select public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000001', 1, 2)$$,
  '42501', 'not an admin', 'a non-admin cannot move an entry');
select throws_ok($$select public.admin_remove_home_entry('poem', 'b0000000-0000-4000-8000-000000000001')$$,
  '42501', 'not an admin', 'a non-admin cannot remove an entry');
select throws_ok($$select * from public.admin_list_home_entries()$$, '42501', 'not an admin',
  'a non-admin cannot list the entries');
select throws_ok($$select public.compact_home_featured_poems()$$, '42501', null,
  'a signed-in user cannot call the compaction body');
select throws_ok($$insert into public.home_featured_poems (poem_id, position)
    values ('b0000000-0000-4000-8000-000000000001', 1)$$,
  '42501', null, 'a non-admin cannot insert into the poem table directly');
select throws_ok($$select * from public.home_featured_authors$$, '42501', null,
  'a non-admin cannot read the author table');

reset role;
select is((select count(*)::int from public.home_featured_poems), 0, 'the refused calls added no poem');
select is((select count(*)::int from public.home_featured_authors), 0, 'the refused calls added no author');

-- ---------- ADM: add poems (task 1.3; FR-8, FR-10) ----------
-- implements FR-8 and FR-10 of home-page-sections
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(public.admin_add_home_poem('b0000000-0000-4000-8000-000000000001') ->> 'status', 'added',
  'an admin adds a first poem');
select is(public.admin_add_home_poem('b0000000-0000-4000-8000-000000000002') ->> 'status', 'added',
  'an admin adds a second poem');
select is(public.admin_add_home_poem('b0000000-0000-4000-8000-000000000003') ->> 'status', 'added',
  'an admin adds a third poem');
select is(public.admin_add_home_poem('b0000000-0000-4000-8000-000000000002') ->> 'status', 'already-in-list',
  'adding a chosen poem again answers already-in-list');
select is(public.admin_add_home_poem('ffffffff-0000-4000-8000-000000000000') ->> 'status', 'not-found',
  'an unknown poem answers not-found');
select is(public.admin_add_home_poem('a0000000-0000-4000-8000-0000000000aa') ->> 'status', 'not-found',
  'a poem of an author who is not public answers not-found');
select is(public.admin_add_home_poem('b0000000-0000-4000-8000-000000000004') ->> 'status', 'added',
  'an admin adds a fourth poem');
select is(public.admin_add_home_poem('b0000000-0000-4000-8000-000000000005') ->> 'status', 'limit-reached',
  'the fifth poem answers limit-reached');
select is(public.admin_add_home_poem('b0000000-0000-4000-8000-000000000003') ->> 'status', 'already-in-list',
  'a chosen poem on a full list answers already-in-list');

select is(
  array(select id from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004']::uuid[],
  'the poems are listed in the order they were added');
select is(
  (select array_agg(entry_position order by entry_position) from public.admin_list_home_entries() where kind = 'poem'),
  array[1, 2, 3, 4], 'the positions are 1 to 4');
select is(
  (select label || '/' || author_name || '/' || shown::text
   from public.admin_list_home_entries() where kind = 'poem' and id = 'b0000000-0000-4000-8000-000000000001'),
  'P1/Boris Active/true', 'a poem row carries its title, its author''s name and shown');

-- Closed to clients, the admin included: only the functions write the tables.
select throws_ok(
  $$insert into public.home_featured_poems (poem_id, position) values ('b0000000-0000-4000-8000-000000000005', 1)$$,
  '42501', null, 'an admin cannot insert into the poem table through the API');
select throws_ok($$update public.home_featured_poems set position = 1$$,
  '42501', null, 'an admin cannot update the poem table through the API');
select throws_ok($$delete from public.home_featured_poems$$,
  '42501', null, 'an admin cannot delete from the poem table through the API');

-- An argument outside the contract is refused, not guessed.
select throws_ok($$select public.admin_move_home_entry('collection', 'b0000000-0000-4000-8000-000000000001', 1, 2)$$,
  '22023', null, 'a move of an unknown kind is refused');
select throws_ok($$select public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000001', null, 2)$$,
  '22023', null, 'a move with no from position is refused');
select throws_ok($$select public.admin_remove_home_entry('collection', 'b0000000-0000-4000-8000-000000000001')$$,
  '22023', null, 'a removal of an unknown kind is refused');

-- ---------- A deleted poem frees its slot (FR-11) ----------
-- implements FR-11 of home-page-sections
reset role;
delete from public.poems where id = 'b0000000-0000-4000-8000-000000000002';

select is(
  (select array_agg(position order by position) from public.home_featured_poems), array[1, 3, 4]::smallint[],
  'deleting a chosen poem leaves a gap in the stored positions and renumbers nothing');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  (select array_agg(entry_position order by entry_position) from public.admin_list_home_entries() where kind = 'poem'),
  array[1, 2, 3], 'the admin''s list shows the remaining poems as 1 to 3, with no gap');
select is(public.admin_add_home_poem('b0000000-0000-4000-8000-000000000005') ->> 'status', 'added',
  'the freed slot can be filled although the stored positions had a gap');

reset role;
select is(
  (select array_agg(position order by position) from public.home_featured_poems), array[1, 2, 3, 4]::smallint[],
  'the add compacted the stored positions to 1 to 4');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

-- ---------- Move (task 1.3; FR-9) ----------
-- implements FR-9 of home-page-sections
-- The list is P1, P3, P4, P5 at ranks 1 to 4.
select is(public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000005', 4, 2) ->> 'status', 'moved',
  'an entry moves to a new place');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P1', 'P5', 'P3', 'P4'], 'the list is renumbered around the moved entry');

select is(public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000003', 1, 4) ->> 'status', 'stale',
  'a move from a rank the entry no longer has answers stale');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P1', 'P5', 'P3', 'P4'], 'a stale move writes nothing');
select is(public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000002', 1, 3) ->> 'status', 'not-found',
  'moving a deleted poem answers not-found');
select is(public.admin_move_home_entry('poem', 'ffffffff-0000-4000-8000-000000000000', 1, 3) ->> 'status', 'not-found',
  'moving an unknown entry answers not-found');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P1', 'P5', 'P3', 'P4'], 'a not-found move writes nothing');

select is(public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000001', 1, 99) ->> 'status', 'moved',
  'a place past the end is clamped to the end');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P5', 'P3', 'P4', 'P1'], 'the first entry went to the end');
select is(public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000005', 1, 4) ->> 'status', 'moved',
  'the first entry moves to the end');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P3', 'P4', 'P1', 'P5'], 'the list reads P3, P4, P1, P5');
select is(public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000005', 4, 1) ->> 'status', 'moved',
  'the last entry moves to the start');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P5', 'P3', 'P4', 'P1'], 'the last entry is first');
select is(public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000001', 4, 0) ->> 'status', 'moved',
  'a place before the start is clamped to the start');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P1', 'P5', 'P3', 'P4'], 'the last entry went to the start');
select is(public.admin_move_home_entry('poem', 'b0000000-0000-4000-8000-000000000005', 2, 2) ->> 'status', 'moved',
  'a move to the place the entry already has answers moved');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P1', 'P5', 'P3', 'P4'], 'and leaves the order as it was');

reset role;
select is(
  (select array_agg(position order by position) from public.home_featured_poems), array[1, 2, 3, 4]::smallint[],
  'the stored positions are 1 to 4 after the moves');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

-- ---------- Remove (task 1.3; FR-9, FR-11) ----------
select is(public.admin_remove_home_entry('poem', 'b0000000-0000-4000-8000-000000000003') ->> 'status', 'removed',
  'an admin removes an entry');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P1', 'P5', 'P4'], 'the rest keep their order');
select is(
  (select array_agg(entry_position order by entry_position) from public.admin_list_home_entries() where kind = 'poem'),
  array[1, 2, 3], 'and are renumbered');
select is(public.admin_remove_home_entry('poem', 'b0000000-0000-4000-8000-000000000003') ->> 'status', 'not-found',
  'removing it again answers not-found');
select is(public.admin_remove_home_entry('poem', 'b0000000-0000-4000-8000-000000000002') ->> 'status', 'not-found',
  'removing a poem that was deleted answers not-found');
select is(public.admin_add_home_poem('c0000000-0000-4000-8000-000000000006') ->> 'status', 'added',
  'the freed slot can be filled again');

reset role;
select is(
  (select array_agg(position order by position) from public.home_featured_poems), array[1, 2, 3, 4]::smallint[],
  'the stored positions are 1 to 4 after the remove and the add');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

-- ---------- The author list works the same way ----------
select is(public.admin_add_home_author('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') ->> 'status', 'added', 'an admin adds an author');
select is(public.admin_add_home_author('cccccccc-cccc-4ccc-8ccc-cccccccccccc') ->> 'status', 'added', 'and a second');
select is(public.admin_add_home_author('dddddddd-dddd-4ddd-8ddd-dddddddddddd') ->> 'status', 'added', 'and a third');
select is(public.admin_add_home_author('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') ->> 'status', 'added', 'and a fourth');
select is(public.admin_add_home_author('ffffffff-ffff-4fff-8fff-ffffffffffff') ->> 'status', 'limit-reached',
  'the fifth author answers limit-reached');
select is(public.admin_add_home_author('cccccccc-cccc-4ccc-8ccc-cccccccccccc') ->> 'status', 'already-in-list',
  'a chosen author answers already-in-list');
select is(public.admin_add_home_author('a7a7a7a7-a7a7-47a7-87a7-a7a7a7a7a7a7') ->> 'status', 'not-found',
  'a profile that is not public answers not-found');
select is(public.admin_add_home_author('99999999-0000-4000-8000-000000000000') ->> 'status', 'not-found',
  'an unknown profile answers not-found');

select is(
  array(select label from public.admin_list_home_entries() where kind = 'author' order by entry_position),
  array['Boris Active', 'Clara Other', 'Dina Third', 'Egor Fourth'], 'the authors are listed in the order they were added');
select is(
  (select author_name is null from public.admin_list_home_entries()
    where kind = 'author' and id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  true, 'an author row has no separate author name');

select is(public.admin_move_home_entry('author', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 4, 1) ->> 'status', 'moved',
  'an author moves to the start');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'author' order by entry_position),
  array['Egor Fourth', 'Boris Active', 'Clara Other', 'Dina Third'], 'the author list is renumbered');
select is(public.admin_move_home_entry('author', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 4, 1) ->> 'status', 'stale',
  'a stale author move answers stale');
select is(public.admin_remove_home_entry('author', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') ->> 'status', 'removed',
  'an admin removes an author');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'author' order by entry_position),
  array['Egor Fourth', 'Clara Other', 'Dina Third'], 'the author list closes the gap');
select is(public.admin_remove_home_entry('author', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') ->> 'status', 'not-found',
  'removing the author again answers not-found');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P1', 'P5', 'P4', 'P6'], 'the poem list was not touched by the author moves');

-- ---------- The public read (task 1.4; FR-2, FR-4, FR-10) ----------
-- implements FR-2, FR-4 and FR-10 of home-page-sections
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  public.home_featured_ids(),
  '{"poem_ids": ["b0000000-0000-4000-8000-000000000001", "b0000000-0000-4000-8000-000000000005",
                 "b0000000-0000-4000-8000-000000000004", "c0000000-0000-4000-8000-000000000006"],
    "author_ids": ["eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                   "dddddddd-dddd-4ddd-8ddd-dddddddddddd"]}'::jsonb,
  'anon gets exactly the chosen ids, in position order');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.home_featured_ids()) k),
  array['author_ids', 'poem_ids'], 'the answer holds the two lists and nothing else');

-- ---------- An author who stops being public stays listed, and is not shown (FR-11) ----------
-- implements FR-10 and FR-11 of home-page-sections
reset role;
update public.author_profiles set last_name = null where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is(
  public.home_featured_ids(),
  '{"poem_ids": ["b0000000-0000-4000-8000-000000000001", "b0000000-0000-4000-8000-000000000005",
                 "b0000000-0000-4000-8000-000000000004"],
    "author_ids": ["eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", "dddddddd-dddd-4ddd-8ddd-dddddddddddd"]}'::jsonb,
  'the public read drops the author who is no longer public and that author''s poem');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is(
  (select label || '/' || shown::text from public.admin_list_home_entries()
    where kind = 'author' and id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'Clara/false', 'the admin''s list keeps the author, marked as not shown');
select is(
  (select label || '/' || author_name || '/' || shown::text from public.admin_list_home_entries()
    where kind = 'poem' and id = 'c0000000-0000-4000-8000-000000000006'),
  'P6/Clara/false', 'and keeps the author''s poem, marked as not shown, with the name that is left');
select is(
  (select count(*)::int from public.admin_list_home_entries() where kind = 'author'), 3,
  'the entry still holds its slot until an admin removes it');
select is(public.admin_add_home_author('ffffffff-ffff-4fff-8fff-ffffffffffff') ->> 'status', 'added',
  'and a fourth author can be added beside it');
select is(public.admin_add_home_author('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') ->> 'status', 'limit-reached',
  'the hidden entry counts toward the cap');
select is(public.admin_remove_home_entry('author', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') ->> 'status', 'removed',
  'an admin removes the hidden entry');

-- ---------- A deleted profile takes its entries (FR-11) ----------
-- implements FR-11 of home-page-sections
select is(public.admin_remove_home_entry('poem', 'b0000000-0000-4000-8000-000000000004') ->> 'status', 'removed',
  'an admin makes room in the poem list');
select is(public.admin_add_home_poem('d0000000-0000-4000-8000-000000000007') ->> 'status', 'added',
  'an admin adds the poem of the author who is deleted below');

reset role;
delete from public.author_profiles where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.admin_list_home_entries()
    where id in ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd0000000-0000-4000-8000-000000000007')),
  0, 'a deleted profile removes both its author entry and its poem entry');
select is(
  array(select label from public.admin_list_home_entries() where kind = 'poem' order by entry_position),
  array['P1', 'P5', 'P6'], 'the remaining poems keep their order');
select is(public.admin_add_home_poem('b0000000-0000-4000-8000-000000000004') ->> 'status', 'added',
  'the freed poem slot can be filled');

select is(
  (select array_agg(entry_position order by entry_position) from public.admin_list_home_entries() where kind = 'author'),
  array[1, 2], 'the admin''s author list shows the two remaining entries as 1 and 2');

reset role;
select is(
  (select array_agg(position order by position) from public.home_featured_authors), array[1, 3]::smallint[],
  'the cascade left a gap in the stored positions, which the next write closes');

-- Everything above ran with the unique position checked at the end of each statement.
select lives_ok($$set constraints all immediate$$, 'no deferred check is pending at the end of the run');

select * from finish();
rollback;
