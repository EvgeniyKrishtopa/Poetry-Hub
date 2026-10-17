-- Per-user write limits: consume_write_allowance() and the counter table's privileges
-- (add-author-profiles, design D13).
-- implements FR-21, NFR-2 of add-author-profiles
-- Run against the local stack: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Fixtures, written as the superuser.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'c@example.test');

-- ---------- anon ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select public.consume_write_allowance('profile_write')$$,
  '42501', null,
  'anon cannot call consume_write_allowance()'
);

reset role;

-- ---------- signed in as A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select ok(
  (select bool_and(public.consume_write_allowance('profile_write')) from generate_series(1, 10)),
  'profile_write: calls 1-10 are allowed'
);

select is(
  public.consume_write_allowance('profile_write'),
  false,
  'profile_write: the 11th call in the window is refused'
);

select ok(
  (select bool_and(public.consume_write_allowance('photo_upload')) from generate_series(1, 5)),
  'photo_upload: calls 1-5 are allowed'
);

select is(
  public.consume_write_allowance('photo_upload'),
  false,
  'photo_upload: the 6th call in the window is refused'
);

select throws_ok(
  $$select public.consume_write_allowance('poem_write')$$,
  '23514', null,
  'an unknown scope raises'
);

select throws_ok(
  'select * from public.write_rate_limits',
  '42501', null,
  'a signed-in user cannot read the counters'
);

select throws_ok(
  $$insert into public.write_rate_limits (user_id, scope, window_start, hits)
    values ('11111111-1111-4111-8111-111111111111', 'profile_write', now(), 1)$$,
  '42501', null,
  'a signed-in user cannot insert a counter'
);

select throws_ok(
  'update public.write_rate_limits set hits = 1',
  '42501', null,
  'a signed-in user cannot reset a counter'
);

select throws_ok(
  'delete from public.write_rate_limits',
  '42501', null,
  'a signed-in user cannot delete a counter'
);

reset role;

-- ---------- signed in as B: A's spent limits are not B's ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select is(
  public.consume_write_allowance('profile_write'),
  true,
  'another user has their own profile_write count'
);

reset role;

-- ---------- signed in as C: the two scopes are separate ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);

select is(
  (select bool_and(public.consume_write_allowance('photo_upload')) from generate_series(1, 6)),
  false,
  'C spends the photo_upload limit'
);

select is(
  public.consume_write_allowance('profile_write'),
  true,
  'a spent photo_upload limit leaves profile_write allowed'
);

reset role;

-- ---------- windows that have passed restart; one that hasn't doesn't ----------
-- As the superuser: move A's windows back 61 seconds, past the minute but not the hour.
update public.write_rate_limits
set window_start = window_start - interval '61 seconds'
where user_id = '11111111-1111-4111-8111-111111111111';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is(
  public.consume_write_allowance('profile_write'),
  true,
  'profile_write: an attempt after the minute window is allowed again'
);

select is(
  public.consume_write_allowance('photo_upload'),
  false,
  'photo_upload: 61 seconds later the hour window still refuses'
);

reset role;

select is(
  (select hits from public.write_rate_limits
   where user_id = '11111111-1111-4111-8111-111111111111' and scope = 'profile_write'),
  1,
  'the restarted window counts from 1'
);

select * from finish();
rollback;
