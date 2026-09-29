# 0002. Tests live in a `tests/` folder at the root of each feature or shared module

## Status

Accepted (2026-09-28)

## Context

Until now tests were colocated as `*.test.ts(x)` files directly next to the code they test (`model/filter-poems.test.ts`, `components/PoemList/PoemList.test.tsx`). As features grew (the home feature alone has five test files), source and test files mixed in the same folders. On review of PR #3 the project owner decided tests must not sit alongside source files.

## Decision

- Each feature (`src/features/<name>/`) and each shared module (`src/shared/ui/`, `src/shared/lib/`, `src/shared/lib/contentful/`) has one `tests/` folder at its root.
- Inside `tests/`, the module's own structure is mirrored: `tests/model/…`, `tests/dal/…`. Component tests go flat into `tests/components/<Name>.test.tsx` (no per-component subfolder); in `shared/ui/`, the flat file sits directly in `tests/` (`shared/ui/tests/Button.test.tsx`).
- Files keep the `*.test.ts(x)` suffix (and `*.integration.test.ts` for integration tests), so `vitest.config.mts`'s `src/**/*.test.{ts,tsx}` include and coverage exclude keep working unchanged.
- Tests import the code under test with relative paths (`../../model/…`), like any other in-feature import; they are not a reason to use a feature's internals from outside it.
- Applied to every existing test in `src/` at once, so the repo has one rule, not two.

## Consequences

**Positive**

- Source folders contain only source; a feature's tests are in one place, easy to find and to review together.
- No tooling change: Vitest globs, coverage config, and the ESLint boundary rule all work as before.

**Negative**

- Longer relative imports in tests (`../../components/PoemList/PoemList`), and a moved or renamed source file needs its mirrored test path moved by hand.

## Alternatives Considered

- Colocated `*.test.ts(x)` next to the code (the previous convention) — rejected by the owner: tests mixed in with source files.
- A `__tests__/` subfolder inside every source folder — rejected: still spreads tests across the feature and multiplies folders; the owner chose one `tests/` per feature.
- A single top-level `tests/` tree outside `src/` — rejected: separates a feature's tests from the feature, breaking feature-first organisation.
