# The database accepts tab, newline and other non-space whitespace as a name or about

- Change: `add-author-profiles`
- Called from: `code-review` (Gate 4 CR-01 and deep review DR-01, both CONFIRMED, group 1, commit 434db78)
- First seen: 2026-10-15
- Limit in force: `maxFixAttempts: 2`

## Failure

The `first_name`, `last_name` and `about` checks use `char_length(btrim(x)) >= 1`. One-argument `btrim` strips only U+0020, so a value made of tabs, newlines, NBSP, U+3000 or U+FEFF passes. A signed-in user writing straight through PostgREST can set both names to whitespace, and the profile becomes public with no visible name (FR-4, NFR-2; spec "Database integrity under direct writes"). The app's `trim()` rejects these values, so the two layers disagree.

## Reproduce

Against the local stack (`npx supabase db reset` applied), as the superuser inside `BEGIN … ROLLBACK`:
create a user and an empty profile, then as `authenticated` (own JWT claims) run
`update public.author_profiles set first_name = E'\t', last_name = E'\n' where user_id = <own>`,
then as `anon` count the rows of `public.author_profiles`.

Result: the update succeeds and anon sees 1 row. Reproduced twice in a row.

## Attempt 1 — 2026-10-15

- Isolated to: `supabase/migrations/20261015160958_author_profiles.sql`, the three content checks; and the pgTAP cases, which only use U+0020, so they could not catch it.
- Hypothesis: `btrim(x)` with one argument removes only spaces. The blank test must cover every character JS `String.prototype.trim()` removes. On the local DB `[[:space:]]` matches tab, CR, LF, NBSP, U+2028 and U+3000 but not U+FEFF, which `trim()` also removes.
- Expected effect: with each check rewritten as `x !~ E'^[[:space:]﻿]*$'` (length limit kept), the reproduction's update fails with 23514 and anon sees 0 rows. New pgTAP cases (tab, newline, NBSP, U+3000, U+FEFF across the three columns) fail against the old migration and pass against the new one; the existing 31 cases still pass.
- What actually happened: the five new blank cases failed against the old migration (tests 17–21) and pass after the fix; a name with surrounding whitespace and real content is still accepted; 41/41 pass after `db reset`. The reproduction's update now fails with `violates check constraint "author_profiles_first_name_check"`.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression — the "Database integrity under direct writes" requirement already says a whitespace-only name is rejected; the pgTAP cases (tab, newline, NBSP, U+3000, BOM) now pin it. Spec not touched.
- Criterion touched: none (FR-4, FR-5 criteria unchanged)
