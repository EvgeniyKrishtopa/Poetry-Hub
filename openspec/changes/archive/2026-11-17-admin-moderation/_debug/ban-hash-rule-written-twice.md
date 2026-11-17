# The ban-list digest rule is written in two places

- Change: `admin-moderation`
- Called from: `code-review` (deep-review DR-10, CONFIRMED)
- First seen: 2026-11-13
- Limit in force: `maxFixAttempts: 2`

## Failure

`admin_ban_user` stores `encode(sha256(convert_to(lower(btrim(email)), 'UTF8')), 'hex')` and
`reject_banned_signup` computes the same expression to look it up. Design D6 and FR-5 require them to produce the
same value. If the normalisation changes in one place only, bans stop matching and the hook, which allows on any
mismatch, lets the sign-up through without an error.

## Reproduce

Not a runtime failure: the rule has no single home. Reproduced as a missing test target in
`supabase/tests/admin_functions.test.sql`: `select public.banned_email_hash(' Foo@Example.Test ')` must equal the
hex sha256 of `foo@example.test`, and `has_function_privilege` must be false for `public`, `anon` and
`authenticated`. Before the fix the function does not exist, so the test errors.

## Attempt 1 — 2026-11-13

- Isolated to: the two expressions in `admin_ban_user` and `reject_banned_signup`.
- Hypothesis: the rule was copied instead of named.
- Expected effect: one internal `immutable` function `public.banned_email_hash(text)` with an empty
  `search_path`, executable by no client role, holds the rule; `admin_ban_user` and `reject_banned_signup` both
  call it; the new checks pass, and the existing ban, hook and sign-up probe results are unchanged.
- What actually happened: `public.banned_email_hash(text)` (`immutable`, empty `search_path`, executable by no
  client role) now holds the rule; `admin_ban_user` and `reject_banned_signup` call it. The new pgTAP checks pass
  (the digest of `'  Foo@Example.Test '` equals the sha256 of `foo@example.test`; the function is in the
  not-executable list). The hook tests and the local Auth probe (HTTP 403 `signup not allowed`, also for another
  case) are unchanged.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: skipped, because the defect was duplicated code behind behaviour FR-5 and FR-17 already state; no
  criterion changes and the pgTAP checks of both requirements still pin the behaviour.
