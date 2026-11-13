# A concurrent block can overwrite a ban, and the banned user then becomes unblockable

- Change: `admin-moderation`
- Called from: `code-review` (deep-review DR-02, CONFIRMED)
- First seen: 2026-11-13
- Limit in force: `maxFixAttempts: 2`

## Failure

`admin_block_user` and `admin_ban_user` check "already restricted?" without locking anything, and
`apply_restriction` ends in `on conflict (user_id) do update set kind = excluded.kind` with no condition. Two
admin calls on one user can both pass their checks; whichever commits second overwrites the row. Ban first, block
second leaves `kind = 'blocked'` while the email hash and `banned_until` stay. `admin_unblock_user` (it deletes
`kind = 'blocked'`) then succeeds, which FR-4 forbids ("a banned user SHALL NOT be unblockable in the app"). Two
concurrent blocks also write two `block` log rows (FR-4: no second log row). Ban locks `auth.users` and then
`account_restrictions`; unblock locks them the other way round, so a concurrent ban and unblock can deadlock.

## Reproduce

Deterministic stand-in for the second writer's overwrite, in `supabase/tests/admin_functions.test.sql`: as the
migration role, `select public.apply_restriction('<user>', 'banned')`, then
`select public.apply_restriction('<user>', 'blocked')`, then read `account_restrictions.kind`. Expected `banned`;
before the fix it reads `blocked`. The lock-order half is not reproducible in a single-session pgTAP file; it is
covered by the same fix (one lock, taken first, in the same order everywhere) and by reading the three functions.

## Attempt 1 — 2026-11-13

- Isolated to: `public.apply_restriction` (unconditional upsert) and the state checks of `admin_block_user`,
  `admin_ban_user`, `admin_unblock_user` (no row lock before the check), in
  `supabase/migrations/20261113180000_admin_moderation_functions.sql`.
- Hypothesis: the check-then-write sequence is not serialised per user, and the upsert may downgrade `banned`.
- Expected effect: (1) the upsert only replaces a `blocked` row, so `apply_restriction(…, 'blocked')` after
  `apply_restriction(…, 'banned')` leaves `banned`; (2) block, ban and unblock take `for update` on the user's
  `auth.users` row first, so two moderation calls on one user run one after the other, the second sees the
  first's restriction and answers `already-restricted` or `not-blocked` with no second log row, and the lock order
  is the same in all three. The new pgTAP check fails before and passes after; every existing check still passes.
- What actually happened: the upsert now carries `where r.kind = 'blocked'`, and block, ban and unblock take
  `for update` on the user's `auth.users` row first. The new pgTAP check (`apply_restriction(…, 'blocked')` on a
  banned account leaves it `banned`) passes; the whole pgTAP suite passes (134 checks in `admin_functions`, the
  other files unchanged); the local Auth probe still blocks, unblocks and bans as recorded in
  `admin-functions-auth-and-storage-check.md`. The two-session race itself and the deadlock were not run
  concurrently; the lock is the same statement in all three functions.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression: FR-4's criterion "Banned users have no unblock" already states the behaviour; the new
  pgTAP check pins the downgrade scenario. The spec is not touched.
