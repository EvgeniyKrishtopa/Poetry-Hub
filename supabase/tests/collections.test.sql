-- RLS, grants, checks, the three write functions, and the create limit with its creation log for collections
-- (add-poem-collections, design D2, D13).
-- implements NFR-1, FR-3, FR-4, FR-5, FR-9, FR-11 and FR-13 of add-poem-collections
-- implements NFR-1 and FR-1 of public-collections: anyone reads a public author's non-empty collections, the
-- owner also their own empty ones, and delete_my_collection() returns the author id.
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(79);

-- Fixtures, written as the superuser (bypasses RLS). A owns a non-public profile, B and D public ones, C has
-- no profile. A and B each have one collection two days old, each holding one poem; B has a second, empty
-- collection and a free poem. D's collections are all empty.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'c@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'd@example.test');

insert into public.author_profiles (id, user_id, first_name, last_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Anna', null),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Boris', 'Pasternak'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', 'Daniil', 'Kharms');

insert into public.collections (id, author_id, title, description, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Черновики', null, now() - interval '2 days'),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Осень', 'Стихи об осени', now() - interval '2 days'),
  ('b0000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Пустой', null, now() - interval '2 days');

insert into public.poems (id, author_id, title, text, collection_id) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Набросок', 'Текст', 'a0000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Осенний сад', 'Текст', 'b0000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Первый снег', 'Текст', null);

-- D already created 50 collections in the last 30 days, 6 hours apart; the trigger logged each one.
-- Known ids, d0000000-0000-4000-8000-0000000000NN, so another author can name one RLS hides from them.
insert into public.collections (id, author_id, title, created_at)
select ('d0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'Сборник ' || n, now() - n * interval '6 hours'
from generate_series(1, 50) as s (n);

-- ---------- anon ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

-- implements FR-1 of public-collections: B's collection holds a poem and B is public; B's second is empty, A's
-- holds a poem but A is not public, and D's are all empty.
select results_eq(
  $$select id::text from public.collections$$,
  array['b0000000-0000-4000-8000-000000000001'],
  'anon reads only a public author''s non-empty collection: not an empty one, not a non-public author''s'
);

select throws_ok(
  $$insert into public.collections (author_id, title) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'T')$$,
  '42501', null,
  'anon cannot insert a collection'
);

select throws_ok($$update public.collections set title = 'Hacked'$$, '42501', null, 'anon cannot update collections');

select throws_ok($$delete from public.collections$$, '42501', null, 'anon cannot delete collections');

select throws_ok($$select public.create_my_collection('T', null)$$, '42501', null, 'anon cannot call create_my_collection()');

select throws_ok(
  $$select public.update_my_collection('b0000000-0000-4000-8000-000000000001', 'Hacked', null)$$,
  '42501', null,
  'anon cannot call update_my_collection()'
);

select throws_ok(
  $$select public.delete_my_collection('b0000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'anon cannot call delete_my_collection()'
);

select throws_ok(
  $$select public.collection_create_status('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', null,
  'anon cannot call collection_create_status()'
);

select throws_ok($$select * from public.collection_create_limits()$$, '42501', null, 'anon cannot call collection_create_limits()');

select throws_ok($$select * from public.collection_creations$$, '42501', null, 'anon cannot read the creation log');

reset role;

-- An authenticated role whose token carries no user id: the functions' own guard, not the grant, stops it.
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

select throws_ok($$select public.create_my_collection('T', null)$$, '42501', null, 'create_my_collection() rejects a token without a user id');

select throws_ok(
  $$select public.update_my_collection('b0000000-0000-4000-8000-000000000001', 'Hacked', null)$$,
  '42501', null,
  'update_my_collection() rejects a token without a user id'
);

select throws_ok(
  $$select public.delete_my_collection('b0000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'delete_my_collection() rejects a token without a user id'
);

reset role;

-- ---------- signed in as B (public profile) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select results_eq(
  $$select id::text from public.collections order by id$$,
  array['b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002'],
  'B reads their own collections, empty or not, not A''s (non-public) or D''s (public, but empty)'
);

select throws_ok(
  $$insert into public.collections (author_id, title) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'T')$$,
  '42501', null,
  'the owner cannot insert a collection directly'
);

select throws_ok(
  $$update public.collections set title = 'Hacked' where id = 'b0000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'the owner cannot update their collection directly'
);

select throws_ok(
  $$delete from public.collections where id = 'b0000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'the owner cannot delete their collection directly'
);

select throws_ok(
  $$select public.collection_create_status('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', null,
  'a signed-in user cannot call collection_create_status()'
);

select throws_ok($$select * from public.collection_create_limits()$$, '42501', null, 'a signed-in user cannot call collection_create_limits()');

select throws_ok($$select * from public.collection_creations$$, '42501', null, 'a signed-in user cannot read the creation log');

select throws_ok(
  $$insert into public.collection_creations (author_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501', null,
  'a signed-in user cannot add to the creation log'
);

select throws_ok($$delete from public.collection_creations$$, '42501', null, 'a signed-in user cannot remove from the creation log');

-- The table checks, through the only write path. Each rejected call fails as a whole statement: it stores
-- nothing and counts in no window.
select throws_ok(
  $$select public.create_my_collection(' ' || chr(9) || chr(160) || chr(12288), null)$$,
  '23514', null,
  'a title of a space, a tab, a no-break space, and an ideographic space is rejected as blank'
);

select throws_ok($$select public.create_my_collection(repeat('я', 81), null)$$, '23514', null, 'an 81-character title is rejected');

select throws_ok($$select public.create_my_collection('T', repeat('я', 1001))$$, '23514', null, 'a 1001-character description is rejected');

select throws_ok($$select public.create_my_collection('T', '')$$, '23514', null, 'an empty-string description is rejected');

select throws_ok($$select public.create_my_collection('T', E'\n\n  ')$$, '23514', null, 'a blank description is rejected');

select is(
  public.create_my_collection('Зима', null)->>'status',
  'created',
  'create_my_collection() stores a collection without a description'
);

-- The upper bounds: an 80-character title and a 1000-character description.
select is(
  public.create_my_collection(repeat('я', 80), repeat('я', 1000))->>'status',
  'created',
  'create_my_collection() stores an 80-character title and a 1000-character description'
);

select results_eq(
  $$select author_id::text, title, description
    from public.collections where created_at = now() order by char_length(title)$$,
  $$values
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Зима', null::text),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', repeat('я', 80), repeat('я', 1000))$$,
  'both created collections belong to the caller''s own profile, with what was passed'
);

select is(
  public.create_my_collection('Зима', 'Ещё одна')->>'status',
  'created',
  'two collections may share a title'
);

-- Updating through the function. B's old collection was inserted at now() - 2 days, and now() is fixed for
-- the whole transaction.
select is(
  public.update_my_collection('b0000000-0000-4000-8000-000000000001', 'Поздняя осень', E'Первая строка\nвторая'),
  '{"status": "updated"}'::jsonb,
  'the owner updates their collection'
);

select results_eq(
  $$select id::text, author_id::text, title, description, created_at = now() - interval '2 days'
    from public.collections where id = 'b0000000-0000-4000-8000-000000000001'$$,
  $$values (
    'b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Поздняя осень',
    E'Первая строка\nвторая', true
  )$$,
  'the update changed the title and description, and kept the id, author, and creation time'
);

select is(
  public.update_my_collection('b0000000-0000-4000-8000-000000000001', 'Поздняя осень', null),
  '{"status": "updated"}'::jsonb,
  'the owner removes the description with null'
);

select is(
  (select description from public.collections where id = 'b0000000-0000-4000-8000-000000000001'),
  null::text,
  'the collection has no description after the removal'
);

select throws_ok(
  $$select public.update_my_collection('b0000000-0000-4000-8000-000000000001', '   ', null)$$,
  '23514', null,
  'an update to a blank title is rejected'
);

select throws_ok(
  $$select public.update_my_collection('b0000000-0000-4000-8000-000000000001', 'T', '')$$,
  '23514', null,
  'an update to an empty-string description is rejected'
);

select throws_ok(
  $$select public.update_my_collection('b0000000-0000-4000-8000-000000000001', repeat('я', 81), null)$$,
  '23514', null,
  'an update to an 81-character title is rejected'
);

select throws_ok(
  $$select public.update_my_collection('b0000000-0000-4000-8000-000000000001', 'T', repeat('я', 1001))$$,
  '23514', null,
  'an update to a 1001-character description is rejected'
);

select is(
  public.update_my_collection('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Hacked', null),
  '{"status": "not-found"}'::jsonb,
  'update_my_collection() answers not-found for an unknown id'
);

select is(
  public.update_my_collection('d0000000-0000-4000-8000-000000000001', 'Hacked', null),
  '{"status": "not-found"}'::jsonb,
  'another (public) author''s collection answers not-found, the same as an unknown id'
);

-- Deleting through the function.
select is(
  public.delete_my_collection('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  '{"status": "not-found"}'::jsonb,
  'delete_my_collection() answers not-found for an unknown id'
);

select is(
  public.delete_my_collection('a0000000-0000-4000-8000-000000000001'),
  '{"status": "not-found"}'::jsonb,
  'another author''s collection answers not-found on delete'
);

select is(
  public.delete_my_collection((select id from public.collections where title = repeat('я', 80))),
  jsonb_build_object('status', 'deleted', 'title', repeat('я', 80), 'author_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'the owner deletes their collection and gets its stored title and author id'
);

select is_empty(
  $$select id from public.collections where title = repeat('я', 80)$$,
  'the deleted collection is gone'
);

reset role;

select results_eq(
  $$select title from public.collections where id = 'a0000000-0000-4000-8000-000000000001'$$,
  array['Черновики'],
  'B''s calls left A''s collection as it was'
);

select is_empty(
  $$select id from public.collections where title = 'Hacked'$$,
  'the not-found updates changed no collection'
);

-- ---------- a collection is visible while it holds a poem ----------
-- implements FR-1 of public-collections: visible with its first poem, hidden again when its last poem leaves
-- (removed or deleted). B's «Пустой» starts empty and «Осень» holds one poem.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000002',
    array['b1000000-0000-4000-8000-000000000002']::uuid[], '{}'),
  '{"status": "saved"}'::jsonb,
  'B adds a free poem to the empty collection'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  $$select id::text from public.collections where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' order by id$$,
  array['b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002'],
  'anon reads the collection once it holds its first poem'
);

reset role;

-- Another public author reads B's collections that hold a poem now (B's empty ones, such as the collections
-- B created above, stay hidden: the filter on ids names the two that matter).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);

select results_eq(
  $$select id::text from public.collections where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' order by id$$,
  array['b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002'],
  'another author reads a public author''s non-empty collections'
);

select is_empty(
  $$select id from public.collections where author_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'another author does not read a non-public author''s collection, though it holds a poem'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select is(
  public.save_my_collection_poems('b0000000-0000-4000-8000-000000000002',
    '{}', array['b1000000-0000-4000-8000-000000000002']::uuid[]),
  '{"status": "saved"}'::jsonb,
  'B removes the collection''s last poem'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  $$select id::text from public.collections where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' order by id$$,
  array['b0000000-0000-4000-8000-000000000001'],
  'anon no longer reads a collection whose last poem was removed'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select is(
  public.delete_my_poem('b1000000-0000-4000-8000-000000000001')->>'status',
  'deleted',
  'B deletes the only poem of «Осень»'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is_empty(
  $$select id from public.collections where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  'anon no longer reads a collection whose only poem was deleted'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select results_eq(
  $$select id::text from public.collections
    where id in ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002') order by id$$,
  array['b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002'],
  'the owner still reads their own empty collections'
);

reset role;

-- ---------- signed in as A (non-public profile) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select results_eq(
  $$select id::text from public.collections$$,
  array['a0000000-0000-4000-8000-000000000001'],
  'an owner with a non-public profile still reads their own collections'
);

select is(
  public.create_my_collection('T', null),
  '{"status": "not-public"}'::jsonb,
  'create_my_collection() answers not-public for a non-public profile'
);

select is(
  public.update_my_collection('a0000000-0000-4000-8000-000000000001', 'Hacked', null),
  '{"status": "not-found"}'::jsonb,
  'an owner with a non-public profile cannot update their own collection'
);

reset role;

select results_eq(
  $$select title from public.collections where author_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  array['Черновики'],
  'the not-public create stored nothing and the not-public update changed nothing'
);

-- Deleting is not gated by public status (design D2), recorded so a later change can't narrow it by accident.
set local role authenticated;

select is(
  public.delete_my_collection('a0000000-0000-4000-8000-000000000001'),
  jsonb_build_object('status', 'deleted', 'title', 'Черновики', 'author_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'an owner with a non-public profile can still delete their own collection, and gets their author id'
);

reset role;

select is_empty(
  $$select id from public.collections where id = 'a0000000-0000-4000-8000-000000000001'$$,
  'the non-public owner''s collection is gone'
);

-- ---------- signed in as C (no profile) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);

select is_empty($$select id from public.collections$$, 'a user without a profile reads no collections');

select is(
  public.create_my_collection('T', null),
  '{"status": "not-public"}'::jsonb,
  'create_my_collection() answers not-public without a profile'
);

select is(
  public.delete_my_collection('b0000000-0000-4000-8000-000000000001'),
  '{"status": "not-found"}'::jsonb,
  'a user without a profile deletes nothing'
);

reset role;

select is_empty(
  $$select 1 from public.author_profiles where user_id = '33333333-3333-4333-8333-333333333333'$$,
  'create_my_collection() creates no profile for a caller without one'
);

-- ---------- signed in as D (50 creations in the last 30 days) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);

select is(
  public.create_my_collection('Пятьдесят первый', null),
  '{"status": "over-limit"}'::jsonb,
  'the 51st create in 30 days answers over-limit'
);

-- implements FR-5 of add-poem-collections: deleting doesn't free a place in the create limit.
select results_eq(
  $$with victims as materialized (
      select id from public.collections where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      order by created_at desc limit 10
    )
    select count(*)::int from victims v where public.delete_my_collection(v.id)->>'status' = 'deleted'$$,
  array[10],
  'D deletes 10 of their collections'
);

select is(
  public.create_my_collection('После удаления', null),
  '{"status": "over-limit"}'::jsonb,
  'after 50 creations and 10 deletes, create_my_collection() still answers over-limit'
);

reset role;

select results_eq(
  $$select count(*)::int from public.collections where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  array[40],
  'the 10 deletes removed D''s collections and the over-limit creates stored nothing'
);

select results_eq(
  $$select count(*)::int from public.collection_creations where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  array[50],
  'the creation log still holds all 50 creations'
);

-- The oldest creation turns exactly 30 days old: the window is strict (created_at > now() - 30 days), so it
-- no longer counts and the window slides.
update public.collection_creations set created_at = now() - interval '30 days'
where ctid = (
  select ctid from public.collection_creations where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  order by created_at limit 1
);

-- An aged creation of another author (B): D's next create prunes only D's own rows, so this one must stay.
insert into public.collection_creations (author_id, created_at)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now() - interval '31 days');

set local role authenticated;

-- A rejected call stores nothing, so it doesn't use up the one free place.
select throws_ok($$select public.create_my_collection('   ', null)$$, '23514', null, 'a blank title is rejected at 49 creations');

select is(
  public.create_my_collection('Пятидесятый', null)->>'status',
  'created',
  'a creation exactly 30 days old no longer counts: the 50th in the window is created'
);

select is(
  public.create_my_collection('Ещё один', null),
  '{"status": "over-limit"}'::jsonb,
  'back at 50 creations in 30 days, over-limit again'
);

reset role;

select results_eq(
  $$select count(*)::int from public.collection_creations where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  array[50],
  'the new creation logged itself and the aged one was pruned: 50 in the window'
);

select is_empty(
  $$select 1 from public.collection_creations
    where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' and created_at <= now() - interval '30 days'$$,
  'a creation 30 days old is pruned on the author''s next create'
);

select isnt_empty(
  $$select 1 from public.collection_creations
    where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and created_at <= now() - interval '30 days'$$,
  'D''s create leaves another author''s aged creations alone'
);

-- ---------- removing a profile removes its collections and its creation log ----------
delete from public.author_profiles where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

select is_empty(
  $$select 1 from public.collections where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  'deleting a profile deletes its collections'
);

select is_empty(
  $$select 1 from public.collection_creations where author_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  'deleting a profile deletes its creation log'
);

select * from finish();
rollback;
