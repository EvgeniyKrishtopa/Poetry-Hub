-- Collection membership: the hidden poems.collection_id, the composite foreign key, the two reads, and the save
-- (add-poems-to-collections, design D2, D13).
-- implements NFR-1, FR-1, FR-4, FR-6, FR-8 and FR-11 of add-poems-to-collections
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(64);

-- Fixtures, written as the superuser (bypasses RLS and grants). A owns a non-public profile, B and D public
-- ones, C has no profile.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'c@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'd@example.test');

insert into public.author_profiles (id, user_id, first_name, last_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Anna', null),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Boris', 'Pasternak'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', 'Daniil', 'Kharms');

-- B has two collections, A and D one each.
insert into public.collections (id, author_id, title, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Черновики', now() - interval '9 days'),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Осенний цикл', now() - interval '9 days'),
  ('b0000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Зима', now() - interval '9 days'),
  ('d0000000-0000-4000-8000-000000000001', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Случаи', now() - interval '9 days');

-- B's poems, one a day apart, newest first: p1 and p2 in «Осенний цикл», p3 free, p4 in «Зима», p5 free.
-- D has a free poem and a collected one; A has a collected one.
insert into public.poems (id, author_id, title, text, collection_id, created_at) values
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Ночной вокзал', 'Текст', 'b0000000-0000-4000-8000-000000000001', now() - interval '1 day'),
  ('b1000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Осенний сад', 'Текст', 'b0000000-0000-4000-8000-000000000001', now() - interval '2 days'),
  ('b1000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Первый снег', 'Текст', null, now() - interval '3 days'),
  ('b1000000-0000-4000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Метель', 'Текст', 'b0000000-0000-4000-8000-000000000002', now() - interval '4 days'),
  ('b1000000-0000-4000-8000-000000000005', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Ливень', 'Текст', null, now() - interval '5 days'),
  ('d1000000-0000-4000-8000-000000000001', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Сонет', 'Текст', null, now() - interval '1 day'),
  ('d1000000-0000-4000-8000-000000000002', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Старуха', 'Текст', 'd0000000-0000-4000-8000-000000000001', now() - interval '2 days'),
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Набросок', 'Текст', 'a0000000-0000-4000-8000-000000000001', now() - interval '1 day');

-- ---------- anon ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$select collection_id from public.poems$$, '42501', null, 'anon cannot select poems.collection_id');

select results_eq(
  $$select count(*)::integer from (
      select id, author_id, title, text, genre_id, illustration_path, created_at from public.poems
      where author_id in (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      )
    ) public_columns$$,
  array[7],
  'anon still selects the public columns of public authors'' poems (B''s five and D''s two, not A''s)'
);

select throws_ok($$update public.poems set collection_id = null$$, '42501', null, 'anon cannot update poems.collection_id');

select throws_ok(
  $$select * from public.my_collection_poem_choices('b0000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'anon cannot call my_collection_poem_choices()'
);

select throws_ok($$select * from public.my_collected_poems()$$, '42501', null, 'anon cannot call my_collected_poems()');

select throws_ok(
  $$select public.save_my_collection_poems(
      'b0000000-0000-4000-8000-000000000001', array['b1000000-0000-4000-8000-000000000003']::uuid[], '{}')$$,
  '42501', null,
  'anon cannot call save_my_collection_poems()'
);

reset role;

-- An authenticated role whose token carries no user id: the function's own guard, not the grant, stops it.
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

select throws_ok(
  $$select public.save_my_collection_poems(
      'b0000000-0000-4000-8000-000000000001', array['b1000000-0000-4000-8000-000000000003']::uuid[], '{}')$$,
  '42501', null,
  'save_my_collection_poems() rejects a token without a user id'
);

reset role;

-- ---------- signed in as B (public profile) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select throws_ok(
  $$select collection_id from public.poems where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '42501', null,
  'the owner cannot select their poems'' collection_id directly'
);

select throws_ok($$select * from public.poems$$, '42501', null, 'select * on poems fails loudly instead of leaking collection_id');

select results_eq(
  $$select title from public.poems where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' order by created_at desc$$,
  array['Ночной вокзал', 'Осенний сад', 'Первый снег', 'Метель', 'Ливень'],
  'the owner still selects the public columns'
);

select throws_ok(
  $$update public.poems set collection_id = 'b0000000-0000-4000-8000-000000000001'
    where id = 'b1000000-0000-4000-8000-000000000003'$$,
  '42501', null,
  'the owner cannot update collection_id directly'
);

-- The reads.
select results_eq(
  $$select id::text, title, selected from public.my_collection_poem_choices('b0000000-0000-4000-8000-000000000001')$$,
  $$values
    ('b1000000-0000-4000-8000-000000000001', 'Ночной вокзал', true),
    ('b1000000-0000-4000-8000-000000000002', 'Осенний сад', true),
    ('b1000000-0000-4000-8000-000000000003', 'Первый снег', false),
    ('b1000000-0000-4000-8000-000000000005', 'Ливень', false)$$,
  'choices: the collection''s own poems selected and the free ones not, newest first; not the poem in «Зима»'
);

select is_empty(
  $$select * from public.my_collection_poem_choices('d0000000-0000-4000-8000-000000000001')$$,
  'choices: another author''s collection returns nothing'
);

select is_empty(
  $$select * from public.my_collection_poem_choices('e0000000-0000-4000-8000-000000000001')$$,
  'choices: an unknown collection returns nothing'
);

select results_eq(
  $$select collection_id::text, id::text, title from public.my_collected_poems()$$,
  $$values
    ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Ночной вокзал'),
    ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002', 'Осенний сад'),
    ('b0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000004', 'Метель')$$,
  'collected: only the caller''s own poems in a collection, newest first'
);

-- The input guard (22023): the app validates first, so these are direct calls.
select throws_ok(
  $$select public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001', null, '{}')$$,
  '22023', null,
  'save: a null list is rejected'
);

select throws_ok(
  $$select public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001', array[null]::uuid[], '{}')$$,
  '22023', null,
  'save: a null element is rejected'
);

select throws_ok(
  $$select public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
      '{}', array[['b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002'],
                  ['b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000004']]::uuid[])$$,
  '22023', null,
  'save: a multi-dimensional list is rejected'
);

select throws_ok(
  $$select public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
      array['b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000003']::uuid[], '{}')$$,
  '22023', null,
  'save: a duplicate is rejected'
);

select throws_ok(
  $$select public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
      array['b1000000-0000-4000-8000-000000000003']::uuid[], array['b1000000-0000-4000-8000-000000000003']::uuid[])$$,
  '22023', null,
  'save: a poem both added and removed is rejected'
);

select throws_ok(
  $$select public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001', '{}', '{}')$$,
  '22023', null,
  'save: two empty lists are rejected'
);

select throws_ok(
  $$select public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
      array(select gen_random_uuid() from generate_series(1, 1001)), '{}')$$,
  '22023', null,
  'save: 1001 added poems are rejected'
);

select throws_ok(
  $$select public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
      '{}', array(select gen_random_uuid() from generate_series(1, 1001)))$$,
  '22023', null,
  'save: 1001 removed poems are rejected'
);

-- 1000 pass the guard; unknown ids then answer 'stale'.
select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    array(select gen_random_uuid() from generate_series(1, 1000)), '{}')->>'status',
  'stale',
  'save: 1000 added poems pass the guard'
);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    '{}', array(select gen_random_uuid() from generate_series(1, 1000)))->>'status',
  'stale',
  'save: 1000 removed poems pass the guard'
);

-- not-found: another author's and an unknown collection answer alike.
select is(
  public.save_my_collection_poems('d0000000-0000-4000-8000-000000000001',
    array['b1000000-0000-4000-8000-000000000003']::uuid[], '{}'),
  '{"status": "not-found"}'::jsonb,
  'save: another author''s collection answers not-found'
);

select is(
  public.save_my_collection_poems('e0000000-0000-4000-8000-000000000001',
    array['b1000000-0000-4000-8000-000000000003']::uuid[], '{}'),
  '{"status": "not-found"}'::jsonb,
  'save: an unknown collection answers not-found'
);

-- stale: one bad poem fails the whole save.
select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    array['b1000000-0000-4000-8000-000000000004']::uuid[], '{}'),
  '{"status": "stale"}'::jsonb,
  'save: adding a poem in another collection answers stale'
);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    array['d1000000-0000-4000-8000-000000000001']::uuid[], '{}'),
  '{"status": "stale"}'::jsonb,
  'save: adding another author''s free poem answers stale'
);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    '{}', array['b1000000-0000-4000-8000-000000000003']::uuid[]),
  '{"status": "stale"}'::jsonb,
  'save: removing a free poem answers stale'
);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    '{}', array['b1000000-0000-4000-8000-000000000004']::uuid[]),
  '{"status": "stale"}'::jsonb,
  'save: removing a poem of another collection answers stale'
);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    '{}', array['d1000000-0000-4000-8000-000000000002']::uuid[]),
  '{"status": "stale"}'::jsonb,
  'save: removing another author''s collected poem answers stale'
);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    array['b1000000-0000-4000-8000-0000000000ff']::uuid[], '{}'),
  '{"status": "stale"}'::jsonb,
  'save: adding a poem deleted meanwhile answers stale'
);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    '{}', array['b1000000-0000-4000-8000-0000000000ff']::uuid[]),
  '{"status": "stale"}'::jsonb,
  'save: removing a poem deleted meanwhile answers stale'
);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    array['b1000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000001']::uuid[],
    array['b1000000-0000-4000-8000-000000000002']::uuid[]),
  '{"status": "stale"}'::jsonb,
  'save: valid poems with one bad one answer stale'
);

select results_eq(
  $$select collection_id::text, id::text from public.my_collected_poems()$$,
  $$values
    ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001'),
    ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000004')$$,
  'nothing was written by any rejected, not-found, or stale save'
);

-- saved: adds and removes in one go.
select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    array['b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000005']::uuid[],
    array['b1000000-0000-4000-8000-000000000002']::uuid[]),
  '{"status": "saved"}'::jsonb,
  'save: the owner adds two free poems and removes one'
);

select results_eq(
  $$select collection_id::text, id::text from public.my_collected_poems()$$,
  $$values
    ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001'),
    ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000003'),
    ('b0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000005')$$,
  'the saved selection is stored'
);

-- Two saves wanting one free poem: the first takes it, the second sees it taken. Real concurrency can't run
-- in one pgTAP transaction; the row locks make the concurrent case wait and then reach this same check.
select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000002',
    array['b1000000-0000-4000-8000-000000000002']::uuid[], '{}'),
  '{"status": "saved"}'::jsonb,
  'save: «Зима» takes the freed poem'
);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    array['b1000000-0000-4000-8000-000000000002']::uuid[], '{}'),
  '{"status": "stale"}'::jsonb,
  'save: a second save wanting the same poem answers stale, so no poem is in two collections'
);

-- The poem functions keep membership as it is.
select is(
  public.update_my_poem('b1000000-0000-4000-8000-000000000001', 'Ночной вокзал II', 'Текст', null, true, null)->>'status',
  'updated',
  'update_my_poem() edits a collected poem'
);

select results_eq(
  $$select collection_id::text, title from public.my_collected_poems()
    where id = 'b1000000-0000-4000-8000-000000000001'$$,
  $$values ('b0000000-0000-4000-8000-000000000001', 'Ночной вокзал II')$$,
  'editing keeps the collection'
);

select is(
  public.delete_my_poem('b1000000-0000-4000-8000-000000000005')->>'status',
  'deleted',
  'delete_my_poem() deletes a collected poem'
);

select is_empty(
  $$select * from public.my_collected_poems() where id = 'b1000000-0000-4000-8000-000000000005'$$,
  'a deleted poem is no longer collected'
);

select is(
  public.create_my_poem('Новое', 'Текст', null, null)->>'status',
  'created',
  'create_my_poem() stores a poem'
);

select results_eq(
  $$select title, selected from public.my_collection_poem_choices('b0000000-0000-4000-8000-000000000001')$$,
  $$values ('Новое', false), ('Ночной вокзал II', true), ('Первый снег', true)$$,
  'a new poem is free and listed unselected, first'
);

select is(
  public.delete_my_collection('b0000000-0000-4000-8000-000000000002')->>'status',
  'deleted',
  'delete_my_collection() deletes «Зима»'
);

select results_eq(
  $$select title, selected from public.my_collection_poem_choices('b0000000-0000-4000-8000-000000000001')$$,
  $$values ('Новое', false), ('Ночной вокзал II', true), ('Осенний сад', false), ('Первый снег', true), ('Метель', false)$$,
  'deleting a collection frees its poems, listed unselected on another collection''s page'
);

reset role;

-- ---------- signed in as A (non-public profile) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  public.save_my_collection_poems('a0000000-0000-4000-8000-000000000001',
    '{}', array['a1000000-0000-4000-8000-000000000001']::uuid[]),
  '{"status": "not-found"}'::jsonb,
  'save: a non-public own profile answers not-found'
);

reset role;

-- ---------- signed in as C (no profile) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    array['b1000000-0000-4000-8000-000000000002']::uuid[], '{}'),
  '{"status": "not-found"}'::jsonb,
  'save: a caller with no profile answers not-found'
);

select is_empty(
  $$select * from public.my_collection_poem_choices('b0000000-0000-4000-8000-000000000001')$$,
  'choices: a caller with no profile gets nothing'
);

select is_empty($$select * from public.my_collected_poems()$$, 'collected: a caller with no profile gets nothing');

reset role;

-- ---------- signed in as D (another public author) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);

select is_empty(
  $$select * from public.my_collection_poem_choices('b0000000-0000-4000-8000-000000000001')$$,
  'choices: B''s collection returns nothing to D'
);

select results_eq(
  $$select id::text from public.my_collected_poems()$$,
  array['d1000000-0000-4000-8000-000000000002'],
  'collected: D sees only their own collected poem'
);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000001',
    array['b1000000-0000-4000-8000-000000000002']::uuid[], '{}'),
  '{"status": "not-found"}'::jsonb,
  'save: D saving into B''s collection answers not-found'
);

select is(
  public.save_my_collection_poems('d0000000-0000-4000-8000-000000000001',
    array['b1000000-0000-4000-8000-000000000002']::uuid[], '{}'),
  '{"status": "stale"}'::jsonb,
  'save: D adding B''s free poem to D''s own collection answers stale'
);

select throws_ok(
  $$select collection_id from public.poems where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '42501', null,
  'another author cannot select collection_id directly'
);

reset role;

-- ---------- as the superuser: the stored rows ----------

select results_eq(
  $$select id::text, author_id::text, title, text, genre_id, illustration_path, created_at = now() - interval '3 days'
    from public.poems where id = 'b1000000-0000-4000-8000-000000000003'$$,
  $$values ('b1000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Первый снег', 'Текст',
    null::text, null::text, true)$$,
  'a saved poem changed nothing but its collection'
);

select results_eq(
  $$select author_id::text, collection_id from public.poems where id = 'b1000000-0000-4000-8000-000000000004'$$,
  $$values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null::uuid)$$,
  'a poem freed by a collection''s deletion keeps its author'
);

select results_eq(
  $$select collection_id from public.poems where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and title = 'Новое'$$,
  $$values (null::uuid)$$,
  'a created poem is stored free'
);

select results_eq(
  $$select collection_id::text from public.poems where id = 'd1000000-0000-4000-8000-000000000002'$$,
  array['d0000000-0000-4000-8000-000000000001'],
  'another author''s membership is untouched'
);

select throws_ok(
  $$update public.poems set collection_id = 'd0000000-0000-4000-8000-000000000001'
    where id = 'b1000000-0000-4000-8000-000000000003'$$,
  '23503', null,
  'the composite foreign key rejects a poem in another author''s collection'
);

select lives_ok(
  $$delete from public.author_profiles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  'deleting a profile with collected poems succeeds'
);

select is_empty(
  $$select id from public.poems where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    union all
    select id from public.collections where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  'the deleted profile''s poems and collections are both gone'
);

select * from finish();
rollback;
