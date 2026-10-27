-- Local test data (refine-author-page-and-contact, design D5). Loaded by `npx supabase db reset` after the
-- migrations ([db.seed] in config.toml); `db push` never runs it, so it never reaches a hosted project.
--
-- LOCAL ONLY. Every reader below signs in with the same placeholder password: local-seed-password
-- It is a throwaway value for the local stack, not a secret; never reuse it or seed a hosted project.
--
-- Six readers with confirmed .test emails: author1..author5 own public profiles, draft-author owns a
-- profile with no names (not public, absent from /authors). Profile ids are fixed so that mockPoemCount
-- gives author1..author5 0..4 mock poems: the ids' code units sum to 1729 + n for the last digit n, and
-- (1729 + n) mod 5 = n - 1. src/features/poems/tests/dal/seed-poem-counts.test.ts checks it, so keep one
-- reader per line in the shape ('<email>', '<user id>', '<profile id>', ...).
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

drop table seed_readers;
