-- Work ordering: positions on collections and poems, the insert triggers, the two move functions, the changed
-- save and delete of a collection, and the order_move limit (drag-and-drop-ordering, design D1, D2).
-- implements NFR-1, NFR-2, FR-1, FR-2, FR-3, FR-4, FR-5, FR-10 and FR-11 of drag-and-drop-ordering
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(91);

-- Readers of an author's lists, in the stored order. A null collection is the author's free poems. Plain SQL
-- functions run as the caller, so under anon and authenticated the same grants and policies apply as to the
-- app's own reads. They vanish with the rollback.
create function public.t_poem_titles(author uuid, coll uuid) returns text
language sql stable as $$
  select coalesce(string_agg(p.title, ',' order by p.position, p.id), '')
  from public.poems p
  where p.author_id = t_poem_titles.author and p.collection_id is not distinct from t_poem_titles.coll
$$;

create function public.t_poem_positions(author uuid, coll uuid) returns integer[]
language sql stable as $$
  select coalesce(array_agg(p.position order by p.position, p.id), '{}')
  from public.poems p
  where p.author_id = t_poem_positions.author and p.collection_id is not distinct from t_poem_positions.coll
$$;

create function public.t_collection_titles(author uuid) returns text
language sql stable as $$
  select coalesce(string_agg(c.title, ',' order by c.position, c.id), '')
  from public.collections c
  where c.author_id = t_collection_titles.author
$$;

create function public.t_collection_positions(author uuid) returns integer[]
language sql stable as $$
  select coalesce(array_agg(c.position order by c.position, c.id), '{}')
  from public.collections c
  where c.author_id = t_collection_positions.author
$$;

-- Fixtures, written as the superuser (bypasses RLS and grants). A owns a non-public profile, B, D, E and G
-- public ones, C has no profile.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'c@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'd@example.test'),
  ('55555555-5555-4555-8555-555555555555', 'e@example.test'),
  ('66666666-6666-4666-8666-666666666666', 'g@example.test');

insert into public.author_profiles (id, user_id, first_name, last_name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Anna', null),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Boris', 'Pasternak'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '44444444-4444-4444-8444-444444444444', 'Daniil', 'Kharms'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '55555555-5555-4555-8555-555555555555', 'Eva', 'Ivanova'),
  ('99999999-9999-4999-8999-999999999999', '66666666-6666-4666-8666-666666666666', 'Gleb', 'Zhiglov');

-- ---------- The backfill (FR-1) ----------

-- G's rows are inserted with no position (the trigger gives them one), then the positions are cleared and the
-- migration's two backfill statements run again, word for word (keep them in step with
-- 20261111160000_work_ordering.sql), and the columns go back to not null. DDL rolls back with the test.
insert into public.collections (id, author_id, title, created_at) values
  ('90000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999999', 'Осенний цикл', now() - interval '5 days'),
  ('90000000-0000-4000-8000-000000000002', '99999999-9999-4999-8999-999999999999', 'Весна', now() - interval '1 day'),
  ('90000000-0000-4000-8000-000000000003', '99999999-9999-4999-8999-999999999999', 'Лето', now() - interval '3 days');

insert into public.poems (id, author_id, title, text, collection_id, created_at) values
  ('91000000-0000-4000-8000-000000000001', '99999999-9999-4999-8999-999999999999', 'Ливень', 'Текст', '90000000-0000-4000-8000-000000000002', now() - interval '4 days'),
  ('91000000-0000-4000-8000-000000000002', '99999999-9999-4999-8999-999999999999', 'Метель', 'Текст', '90000000-0000-4000-8000-000000000002', now() - interval '1 day'),
  ('91000000-0000-4000-8000-000000000003', '99999999-9999-4999-8999-999999999999', 'Набросок', 'Текст', null, now() - interval '3 days'),
  ('91000000-0000-4000-8000-000000000004', '99999999-9999-4999-8999-999999999999', 'Сонет', 'Текст', null, now() - interval '1 day'),
  ('91000000-0000-4000-8000-000000000005', '99999999-9999-4999-8999-999999999999', 'Старуха', 'Текст', null, now() - interval '2 days');

alter table public.collections alter column position drop not null;
alter table public.poems alter column position drop not null;
update public.collections set position = null where author_id = '99999999-9999-4999-8999-999999999999';
update public.poems set position = null where author_id = '99999999-9999-4999-8999-999999999999';

update public.collections c set position = r.rn
from (
  select q.id, row_number() over (partition by q.author_id order by q.created_at desc, q.id) - 1 as rn
  from public.collections q
) r
where c.id = r.id;

update public.poems p set position = r.rn
from (
  select q.id, row_number() over (partition by q.author_id, q.collection_id order by q.created_at desc, q.id) - 1 as rn
  from public.poems q
) r
where p.id = r.id;

alter table public.collections alter column position set not null;
alter table public.poems alter column position set not null;

select is(
  public.t_collection_titles('99999999-9999-4999-8999-999999999999'),
  'Весна,Лето,Осенний цикл',
  'backfill: the collections keep newest first'
);

select is(
  public.t_poem_titles('99999999-9999-4999-8999-999999999999', '90000000-0000-4000-8000-000000000002'),
  'Метель,Ливень',
  'backfill: a collection''s poems keep newest first'
);

select is(
  public.t_poem_titles('99999999-9999-4999-8999-999999999999', null),
  'Сонет,Старуха,Набросок',
  'backfill: the free poems keep newest first'
);

select is(
  public.t_collection_positions('99999999-9999-4999-8999-999999999999')
    || public.t_poem_positions('99999999-9999-4999-8999-999999999999', null)
    || public.t_poem_positions('99999999-9999-4999-8999-999999999999', '90000000-0000-4000-8000-000000000002'),
  array[0, 1, 2, 0, 1, 2, 0, 1],
  'backfill: every list starts at 0 with no gap, the free poems apart from each collection'
);

-- ---------- Fixtures for the moves ----------

-- B: collections Осень, Зима, Весна (empty). Осень: А, Б, В. Зима: Г, Д. Free: Х, Ю. Positions are explicit.
insert into public.collections (id, author_id, title, created_at, position) values
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Осень', now() - interval '9 days', 0),
  ('b0000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Зима', now() - interval '9 days', 1),
  ('b0000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Весна', now() - interval '9 days', 2);

insert into public.poems (id, author_id, title, text, collection_id, position) values
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'А', 'Текст', 'b0000000-0000-4000-8000-000000000001', 0),
  ('b1000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Б', 'Текст', 'b0000000-0000-4000-8000-000000000001', 1),
  ('b1000000-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'В', 'Текст', 'b0000000-0000-4000-8000-000000000001', 2),
  ('b1000000-0000-4000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Г', 'Текст', 'b0000000-0000-4000-8000-000000000002', 0),
  ('b1000000-0000-4000-8000-000000000005', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Д', 'Текст', 'b0000000-0000-4000-8000-000000000002', 1),
  ('b1000000-0000-4000-8000-000000000006', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Х', 'Текст', null, 0),
  ('b1000000-0000-4000-8000-000000000007', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Ю', 'Текст', null, 1);

-- D: one collection with a poem, one free poem. A: one collection with a poem (a non-public profile).
insert into public.collections (id, author_id, title, created_at, position) values
  ('d0000000-0000-4000-8000-000000000001', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Случаи', now() - interval '9 days', 0),
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Черновики', now() - interval '9 days', 0);

insert into public.poems (id, author_id, title, text, collection_id, position) values
  ('d1000000-0000-4000-8000-000000000001', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Сонет', 'Текст', null, 0),
  ('d1000000-0000-4000-8000-000000000002', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Старуха', 'Текст', 'd0000000-0000-4000-8000-000000000001', 0),
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Набросок', 'Текст', 'a0000000-0000-4000-8000-000000000001', 0);

-- E: Осень (Б, В), Зима (Д), free А, Г, Ж, З with explicit creation days for the checklist order of a save.
insert into public.collections (id, author_id, title, created_at, position) values
  ('e0000000-0000-4000-8000-000000000001', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Осень', now() - interval '9 days', 0),
  ('e0000000-0000-4000-8000-000000000002', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Зима', now() - interval '9 days', 1);

insert into public.poems (id, author_id, title, text, collection_id, created_at, position) values
  ('e1000000-0000-4000-8000-000000000001', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Б', 'Текст', 'e0000000-0000-4000-8000-000000000001', now() - interval '10 days', 0),
  ('e1000000-0000-4000-8000-000000000002', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'В', 'Текст', 'e0000000-0000-4000-8000-000000000001', now() - interval '11 days', 1),
  ('e1000000-0000-4000-8000-000000000003', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Д', 'Текст', 'e0000000-0000-4000-8000-000000000002', now() - interval '15 days', 0),
  ('e1000000-0000-4000-8000-000000000004', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'А', 'Текст', null, now() - interval '12 days', 0),
  ('e1000000-0000-4000-8000-000000000005', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Г', 'Текст', null, now() - interval '13 days', 1),
  ('e1000000-0000-4000-8000-000000000006', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Ж', 'Текст', null, now() - interval '14 days', 2),
  ('e1000000-0000-4000-8000-000000000007', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'З', 'Текст', null, now() - interval '9 days', 3);

-- ---------- anon ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000001'),
  'А,Б,В',
  'guest: reads the order of a public author''s collection poems'
);

select is(
  public.t_collection_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'Осень,Зима',
  'guest: reads the order of a public author''s non-empty collections, the empty one stays hidden'
);

select is(
  public.t_poem_titles('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a0000000-0000-4000-8000-000000000001'),
  '',
  'guest: reads nothing of a non-public author''s poems'
);

select is(
  public.t_collection_titles('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  '',
  'guest: reads nothing of a non-public author''s collections'
);

select throws_ok($$update public.poems set position = 5$$, '42501', null, 'anon cannot update poems.position');
select throws_ok($$update public.collections set position = 5$$, '42501', null, 'anon cannot update collections.position');

select throws_ok(
  $$select public.move_my_poem('b1000000-0000-4000-8000-000000000001', null, null, 0)$$,
  '42501', null,
  'anon cannot execute move_my_poem'
);

select throws_ok(
  $$select public.move_my_collection('b0000000-0000-4000-8000-000000000001', 0)$$,
  '42501', null,
  'anon cannot execute move_my_collection'
);

-- ---------- Signed in as B ----------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select throws_ok($$update public.poems set position = 5$$, '42501', null, 'authenticated cannot update poems.position');
select throws_ok($$update public.collections set position = 5$$, '42501', null, 'authenticated cannot update collections.position');

-- Inside a collection (FR-2). В goes first.
select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 0),
  '{"status": "moved", "author_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}'::jsonb,
  'move: a poem moves inside its collection and the answer carries the author'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000001'),
  'В,А,Б',
  'move: the others keep their relative order'
);

-- Across collections (FR-3). А goes between Г and Д.
select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 1)->>'status',
  'moved',
  'move: a poem moves to another collection'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  'Г,А,Д',
  'move: the poem stands where it was dropped in the target'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000001'),
  'В,Б',
  'move: the source keeps the others'' order'
);

select is(
  public.t_poem_positions('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000001')
    || public.t_poem_positions('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  array[0, 1, 0, 1, 2],
  'move: both lists are renumbered from 0 with no gap'
);

-- Into an empty collection (FR-3). Б goes to Весна.
select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 0)->>'status',
  'moved',
  'move: a poem moves into an empty collection'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000003'),
  'Б',
  'move: the empty collection now holds the poem'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000001'),
  'В',
  'move: the collection the last-but-one poem left keeps the other'
);

-- Out to the free poems (FR-4). Г goes between Х and Ю.
select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', null, 1)->>'status',
  'moved',
  'move: a poem moves out of a collection to the free poems'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null),
  'Х,Г,Ю',
  'move: the poem stands where it was dropped among the free poems'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  'А,Д',
  'move: the collection it left keeps the others'
);

-- From the free poems into a collection (FR-4). Х goes between А and Д.
select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000006', null, 'b0000000-0000-4000-8000-000000000002', 1)->>'status',
  'moved',
  'move: a free poem moves into a collection'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002')
    || '|' || public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null),
  'А,Х,Д|Г,Ю',
  'move: the collection has the poem in place and the free poems no longer do'
);

-- A place beyond the end and below the start is clamped (NFR-1).
select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 99)->>'status',
  'moved',
  'move: a place beyond the end is accepted'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  'Х,Д,А',
  'move: a place beyond the end makes the poem last'
);

select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', -5)->>'status',
  'moved',
  'move: a place below the start is accepted'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  'А,Х,Д',
  'move: a place below the start makes the poem first'
);

-- The same place changes nothing.
select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 1)->>'status',
  'moved',
  'move: dropping a poem on its own place is accepted'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  'А,Х,Д',
  'move: dropping a poem on its own place leaves the order'
);

-- Inside the free poems (FR-4). Ю goes first.
select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000007', null, null, 0)->>'status',
  'moved',
  'move: a free poem moves among the free poems'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null),
  'Ю,Г',
  'move: the free poems follow the drop'
);

-- Stale (FR-11): nothing is written.
select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', null, 0),
  '{"status": "stale"}'::jsonb,
  'move: a poem that is not where the browser saw it answers stale'
);

select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000006', null, 'b0000000-0000-4000-8000-000000000001', 0),
  '{"status": "stale"}'::jsonb,
  'move: a poem the browser saw free but that is in a collection answers stale'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null)
    || '|' || public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000001')
    || '|' || public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  'Ю,Г|В|А,Х,Д',
  'move: a stale answer wrote nothing'
);

-- Not found (FR-11): another author's items and unknown ids answer alike.
select is(
  public.move_my_poem('d1000000-0000-4000-8000-000000000001', null, null, 0),
  '{"status": "not-found"}'::jsonb,
  'move: another author''s poem answers not-found'
);

select is(
  (select position from public.poems where id = 'd1000000-0000-4000-8000-000000000001'),
  0,
  'move: another author''s poem was not touched'
);

select is(
  public.move_my_poem('b1000000-0000-4000-8000-0000000000ff', null, null, 0),
  '{"status": "not-found"}'::jsonb,
  'move: an unknown poem answers like another author''s'
);

select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 0),
  '{"status": "not-found"}'::jsonb,
  'move: another author''s collection as the target answers not-found'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  'А,Х,Д',
  'move: the poem stayed where it was'
);

select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-0000000000ff', 0),
  '{"status": "not-found"}'::jsonb,
  'move: an unknown target collection answers not-found'
);

select throws_ok(
  $$select public.move_my_poem('b1000000-0000-4000-8000-000000000006', null, null, null)$$,
  '22023', null,
  'move: a null place is rejected'
);

select throws_ok(
  $$select public.move_my_poem(null, null, null, 0)$$,
  '22023', null,
  'move: a null poem id is rejected'
);

-- Collections (FR-5). Order now: Осень, Зима, Весна. Весна goes first, carrying its poem.
select is(
  public.move_my_collection('b0000000-0000-4000-8000-000000000003', 0),
  '{"status": "moved", "author_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}'::jsonb,
  'move collection: a collection moves and the answer carries the author'
);

select is(
  public.t_collection_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'Весна,Осень,Зима',
  'move collection: the others keep their relative order'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000003')
    || '|' || public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  'Б|А,Х,Д',
  'move collection: every collection keeps its poems in their order'
);

select is(
  public.move_my_collection('b0000000-0000-4000-8000-000000000003', 99)->>'status',
  'moved',
  'move collection: a place beyond the end is accepted'
);

select is(
  public.t_collection_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'Осень,Зима,Весна',
  'move collection: a place beyond the end makes it last'
);

select is(
  public.move_my_collection('b0000000-0000-4000-8000-000000000002', -3)->>'status',
  'moved',
  'move collection: a place below the start is accepted'
);

select is(
  public.t_collection_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'Зима,Осень,Весна',
  'move collection: a place below the start makes it first'
);

select is(
  public.move_my_collection('b0000000-0000-4000-8000-000000000002', 0)->>'status'
    || '|' || public.t_collection_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'moved|Зима,Осень,Весна',
  'move collection: dropping a collection on its own place leaves the order'
);

select is(
  public.t_collection_positions('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  array[0, 1, 2],
  'move collection: the collections are renumbered from 0 with no gap'
);

select is(
  public.move_my_collection('d0000000-0000-4000-8000-000000000001', 0),
  '{"status": "not-found"}'::jsonb,
  'move collection: another author''s collection answers not-found'
);

select is(
  public.move_my_collection('b0000000-0000-4000-8000-0000000000ff', 0),
  '{"status": "not-found"}'::jsonb,
  'move collection: an unknown collection answers like another author''s'
);

select throws_ok(
  $$select public.move_my_collection('b0000000-0000-4000-8000-000000000001', null)$$,
  '22023', null,
  'move collection: a null place is rejected'
);

select throws_ok(
  $$select public.move_my_collection(null, 0)$$,
  '22023', null,
  'move collection: a null collection id is rejected'
);

select is(
  public.t_collection_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'Зима,Осень,Весна',
  'move collection: a not-found or rejected move wrote nothing'
);

-- A delete keeps the rest in order (FR-1). Х leaves «Зима».
select is(
  public.delete_my_poem('b1000000-0000-4000-8000-000000000006')->>'status',
  'deleted',
  'delete: the owner deletes a poem'
);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  'А,Д',
  'delete: the collection keeps the others in order'
);

-- A guest follows the moves (FR-3, public-collections FR-1): the last poem leaves «Осень», so it disappears,
-- and «Весна», which got a poem earlier, is shown.
select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', null, 0)->>'status',
  'moved',
  'move: the last poem leaves a collection'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  public.t_collection_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'Зима,Весна',
  'guest: sees the collection that got a poem, and no longer the one that was emptied'
);

-- ---------- Not public (A) and no profile (C): not-found (FR-11) ----------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  public.move_my_poem('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', null, 0),
  '{"status": "not-found"}'::jsonb,
  'move: a non-public profile answers not-found'
);

select is(
  public.move_my_collection('a0000000-0000-4000-8000-000000000001', 0),
  '{"status": "not-found"}'::jsonb,
  'move collection: a non-public profile answers not-found'
);

reset role;

select is(
  (select collection_id::text from public.poems where id = 'a1000000-0000-4000-8000-000000000001'),
  'a0000000-0000-4000-8000-000000000001',
  'move: the non-public author''s poem was not moved'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);

select is(
  public.move_my_poem('b1000000-0000-4000-8000-000000000001', null, null, 0),
  '{"status": "not-found"}'::jsonb,
  'move: a caller with no profile answers not-found'
);

-- ---------- The limit (NFR-2): C, who has no other counter yet ----------
select is(
  (select bool_and(public.consume_write_allowance('order_move')) from generate_series(1, 30)),
  true,
  'order_move: calls 1-30 are allowed'
);

select is(
  public.consume_write_allowance('order_move'),
  false,
  'order_move: the 31st call in the window is refused'
);

select is(
  public.consume_write_allowance('collection_edit'),
  true,
  'order_move: a spent limit leaves the other scopes allowed'
);

-- ---------- Saving a collection's poems (FR-10), signed in as E ----------
-- Осень: Б, В. Free: А, Г, Ж, З. Add А and remove В.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}', true);

select is(
  public.save_my_collection_poems('e0000000-0000-4000-8000-000000000001',
    array['e1000000-0000-4000-8000-000000000004']::uuid[],
    array['e1000000-0000-4000-8000-000000000002']::uuid[]),
  '{"status": "saved"}'::jsonb,
  'save: the owner adds a free poem and removes one'
);

select is(
  public.t_poem_titles('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'e0000000-0000-4000-8000-000000000001')
    || '|' || public.t_poem_titles('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', null),
  'А,Б|В,Г,Ж,З',
  'save: the added poem is first in the collection and the removed one first among the free poems'
);

-- Add Ж and З together: З is newer, so the checklist order puts З first.
select is(
  public.save_my_collection_poems('e0000000-0000-4000-8000-000000000001',
    array['e1000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000007']::uuid[],
    '{}'::uuid[]),
  '{"status": "saved"}'::jsonb,
  'save: the owner adds two free poems'
);

select is(
  public.t_poem_titles('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'e0000000-0000-4000-8000-000000000001'),
  'З,Ж,А,Б',
  'save: several added poems are first in the checklist order (newest created first), the others unmoved'
);

-- Remove Б and З: they keep the order they had in the collection (З before Б) and go first among the free poems.
select is(
  public.save_my_collection_poems('e0000000-0000-4000-8000-000000000001',
    '{}'::uuid[],
    array['e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000007']::uuid[]),
  '{"status": "saved"}'::jsonb,
  'save: the owner removes two poems'
);

select is(
  public.t_poem_titles('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', null)
    || '|' || public.t_poem_titles('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'e0000000-0000-4000-8000-000000000001'),
  'З,Б,В,Г|Ж,А',
  'save: removed poems are first among the free poems in their collection order, the rest unmoved'
);

-- Deleting «Осень» frees Ж and А first, in their order (FR-1).
select is(
  public.delete_my_collection('e0000000-0000-4000-8000-000000000001')->>'status',
  'deleted',
  'delete collection: the owner deletes a collection holding poems'
);

select is(
  public.t_poem_titles('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', null),
  'Ж,А,З,Б,В,Г',
  'delete collection: its poems are first among the free poems, in their collection order'
);

select is(
  public.t_poem_titles('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'e0000000-0000-4000-8000-000000000002'),
  'Д',
  'delete collection: another collection is untouched'
);

-- The advisory lock does not stop a delete of an unknown collection from answering as before.
select is(
  public.delete_my_collection('e0000000-0000-4000-8000-0000000000ff'),
  '{"status": "not-found"}'::jsonb,
  'delete collection: an unknown collection answers not-found'
);

-- ---------- Creating goes first (FR-1), signed in as D ----------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);

select is(
  public.create_my_poem('Новый', 'Текст', null, null)->>'status',
  'created',
  'create: the owner creates a poem'
);

select is(
  public.t_poem_titles('dddddddd-dddd-4ddd-8ddd-dddddddddddd', null),
  'Новый,Сонет',
  'create: a new poem is the first of the free poems'
);

select is(
  public.create_my_collection('Новая', null)->>'status',
  'created',
  'create: the owner creates a collection'
);

select is(
  public.t_collection_titles('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  'Новая,Случаи',
  'create: a new collection is the first of the author''s collections'
);

-- ---------- Direct inserts (the trigger), as the superuser ----------
reset role;

insert into public.collections (id, author_id, title)
values ('b0000000-0000-4000-8000-0000000000a1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Прямая');

select is(
  (select title from public.collections where author_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' order by position, id limit 1),
  'Прямая',
  'trigger: an insert with no position gets the first one of the author''s collections'
);

insert into public.poems (id, author_id, title, text, collection_id)
values ('b1000000-0000-4000-8000-0000000000a1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Прямое', 'Текст', null);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null),
  'Прямое,В,Ю,Г',
  'trigger: an insert with no position gets the first one of the free poems'
);

insert into public.poems (id, author_id, title, text, collection_id)
values ('b1000000-0000-4000-8000-0000000000a2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Прямое в сборнике', 'Текст', 'b0000000-0000-4000-8000-000000000002');

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b0000000-0000-4000-8000-000000000002'),
  'Прямое в сборнике,А,Д',
  'trigger: an insert with no position gets the first one of its collection'
);

insert into public.poems (id, author_id, title, text, collection_id, position)
values ('b1000000-0000-4000-8000-0000000000a3', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'С позицией', 'Текст', null, 100);

select is(
  public.t_poem_titles('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null),
  'Прямое,В,Ю,Г,С позицией',
  'trigger: an insert that names a position keeps it'
);

-- The two trigger functions are internal.
select is(
  has_function_privilege('authenticated', 'public.set_first_poem_position()', 'execute')
    or has_function_privilege('authenticated', 'public.set_first_collection_position()', 'execute')
    or has_function_privilege('anon', 'public.set_first_poem_position()', 'execute')
    or has_function_privilege('anon', 'public.set_first_collection_position()', 'execute'),
  false,
  'the position trigger functions are not executable by a client role'
);

select * from finish();
rollback;
