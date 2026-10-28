-- Local test data (refine-author-page-and-contact, design D5). Loaded by `npx supabase db reset` after the
-- migrations ([db.seed] in config.toml). A plain `db push` doesn't run it, but `db push --include-seed`,
-- `supabase bootstrap`, and Supabase Branching preview branches do: never use those against a hosted
-- project while this file holds sign-in accounts (docs/environment.md).
--
-- LOCAL ONLY. Every reader below signs in with the same placeholder password: local-seed-password
-- It is a throwaway value for the local stack, not a secret; never reuse it or seed a hosted project.
--
-- Six readers with confirmed .test emails: author1..author5 own public profiles, draft-author owns a
-- profile with no names (not public, absent from /authors). Keep one reader per line in the shape
-- ('<email>', '<user id>', '<profile id>', ...): src/features/poems/tests/dal/seed-poem-counts.test.ts
-- reads it.
--
-- Poems (add-poem-creation FR-14, design D12): authorN gets the first N - 1 of the four poems below, in
-- their order (author1 none, author5 all four), with no genre and no illustration, created at noon UTC on
-- each poem's publication date, so pages and recorded scenarios keep the same counts, dates, and order.
-- Poem ids are fixed, 30000000-0000-4000-8000-0000000000NM for authorN's poem M, so a scenario can open
-- a poem by URL after every reset. The seed inserts directly, bypassing create_my_poem() and its limit.
--
-- The seed runs as the database owner: RLS and the column grants don't apply. No about_align value is
-- written, so the seed works before and after the migration that drops that column.

create temporary table seed_readers (
  email      text primary key,
  user_id    uuid not null,
  profile_id uuid not null,
  first_name text,
  last_name  text,
  about      text
);

insert into seed_readers (email, user_id, profile_id, first_name, last_name, about) values
  ('author1@example.test', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Мария', 'Светлова', E'## О себе\n\nПишу короткие стихи о городе.\n\n- верлибр\n- хокку'),
  ('author2@example.test', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Илья', 'Озёров', E'## Поэт\n\nЖиву у реки и пишу о ней.\n\n- пейзажная лирика\n- сонеты'),
  ('author3@example.test', '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Анна', 'Белозёрская', E'## Немного обо мне\n\nСобираю строчки в дороге.\n\n- путевые заметки\n- баллады'),
  ('author4@example.test', '20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'Пётр', 'Ласточкин', E'## Кто я\n\nПишу для детей и взрослых.\n\n- басни\n- считалки\n- колыбельные'),
  ('author5@example.test', '20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'Ольга', 'Северина', E'## Поэтесса\n\nЛюблю зиму и длинные ночи.\n\n- элегии\n- романсы'),
  ('draft-author@example.test', '20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', null, null, null);

-- GoTrue reads the token columns as strings and fails sign-in on NULL, so they get empty strings.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', r.user_id, 'authenticated', 'authenticated', r.email,
  extensions.crypt('local-seed-password', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
  '', '', '', ''
from seed_readers r;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  r.user_id::text, r.user_id,
  jsonb_build_object('sub', r.user_id::text, 'email', r.email, 'email_verified', true),
  'email', now(), now(), now()
from seed_readers r;

insert into public.author_profiles (id, user_id, first_name, last_name, about)
select r.profile_id, r.user_id, r.first_name, r.last_name, r.about
from seed_readers r;

-- The four poems, in the order authors receive them.
create temporary table seed_poems (
  position     integer primary key,
  title        text not null,
  text         text not null,
  published_on date not null
);

insert into seed_poems (position, title, text, published_on) values
  (1, 'Осенний сад', $$Листва ложится на дорожки,
Шуршит под шагом тишина,
И капли светятся, как брошки,
На тёмной ветке у окна.

Ещё тепло, но день короче,
И пахнет яблоком в траве,
И сад молчит, и между прочим
Хранит всё лето в голове.$$, '2026-03-12'),
  (2, 'Ночной вокзал', $$Табло мигает жёлтыми словами,
Последний поезд медлит у перрона,
И проводник с потёртыми флажками
Глядит на нас устало и бессонно.

Здесь каждый ждёт кого-то или что-то,
Сжимая в пальцах тёплые билеты,
И пахнет кофе, рельсами, работой,
И город спит, не зная про всё это.

Гудок. Вагон качнулся, свет поплыл,
Состав ушёл в густую темноту,
А я стою, как будто что-то забыл.$$, '2026-07-01'),
  (3, 'Зимний мост', $$Над речкой мост, и снег лежит на перилах,
Следы прохожих тают до утра.
Я помню, как мы здесь когда-то были
И как смеялись, глядя в холода.

Теперь вода под коркой ледяною
Течёт без нас, неслышно и светло,
И только ветер говорит со мною
О том, что было и уже прошло.$$, '2026-01-20'),
  (4, 'Утренний двор', $$Дворник метёт асфальт
широкими спокойными движениями,
как будто пишет письмо
всему переулку.

Голуби читают его первыми.
Потом соседка с собакой,
потом мальчик с рюкзаком,
опаздывающий в школу.

К полудню письмо исчезнет,
но двор весь день
будет помнить,
что с ним говорили.$$, '2026-09-05');

insert into public.poems (id, author_id, title, text, created_at)
select
  format('30000000-0000-4000-8000-0000000000%s%s', a.n, p.position)::uuid,
  r.profile_id,
  p.title,
  p.text,
  (p.published_on + time '12:00') at time zone 'UTC'
from generate_series(2, 5) as a (n)
join seed_readers r on r.email = format('author%s@example.test', a.n)
join seed_poems p on p.position <= a.n - 1;

drop table seed_poems;
drop table seed_readers;
