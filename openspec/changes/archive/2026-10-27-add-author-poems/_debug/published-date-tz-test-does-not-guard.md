# The published-date time-zone test passes without the UTC guard

- Change: `add-author-poems`
- Called from: `code-review`
- First seen: 2026-10-24
- Limit in force: `maxFixAttempts: 2`

## Failure

Gate 5 CONFIRMED CR-08: `src/features/poems/tests/model/format-published-date.test.ts`'s
"keeps the day when the server's time zone is behind UTC" case (FR-4) sets `process.env.TZ`
after the module, and its module-level `Intl.DateTimeFormat`, is already created, so the case
cannot fail if `timeZone: "UTC"` is removed from `format-published-date.ts`.

## Reproduce

Remove `timeZone: "UTC"` from `PUBLISHED_DATE_FORMAT`, then
`npx vitest run src/features/poems/tests/model/format-published-date.test.ts`: 2 passed, twice
in a row (machine zone Europe/Kyiv, `TZ` unset).

## Attempt 1 — 2026-10-24

- Isolated to: the test file. The formatter's zone is resolved when the module loads; the static
  import loads it before the test body sets `TZ`, so the zone the case claims to test never
  reaches the formatter.
- Hypothesis: the case must set `TZ` to a zone behind UTC before the module is evaluated:
  `vi.resetModules()`, set `TZ`, then a dynamic `import()` of the module inside the case.
- Expected effect: with `timeZone: "UTC"` removed, the case fails (it prints the previous day,
  31 December 2025); with it restored, both cases pass.
- What actually happened: with the guard removed the case failed, received 31 December 2025 (in Russian);
  with the source restored from a backup, 2 passed.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression: FR-4's "Date does not depend on the server's time zone" Then line
  already states the behaviour; the code was right, the test now pins it. Spec untouched.
