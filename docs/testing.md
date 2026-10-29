# Testing

Read before writing or moving a test.

- Vitest + Testing Library (jsdom), as `*.test.ts(x)` in a `tests/` folder at the root of each feature or shared module, mirroring its structure (`features/home/tests/model/…`, `features/home/tests/components/HomeGreeting.test.tsx`, `shared/lib/contentful/tests/…`) — never mixed in with source files (`docs/decisions/0002-tests-folder-per-module.md`).
- Test pure `model/` logic directly; test components through user-visible behavior (roles, labels).
- `src/app/**` is excluded from coverage — route composition and async Server Components are verified by browser QA (`web-qa`) instead.
- Coverage threshold: 80% statements/lines/functions (`npm run test:coverage`).
- Database rules (RLS, column grants, checks, Storage policies) are tested with pgTAP in `supabase/tests/*.test.sql`: `npx supabase test db` against the running local stack (`npx supabase start`, then `npx supabase db reset` to apply the migrations). Each file runs in a transaction that rolls back. Local only: not part of `npm test`, the pre-push hook, or CI. A policy test needs a positive case (the owner can) next to the negative one: a missing policy denies everything, so a negative case alone passes against it too.
- Browser QA flows a human chose to keep are recorded as `@playwright/test` scenarios in `tests/web-qa-scenarios/` (`npx playwright test`; `playwright.config.ts` starts the dev server). Gate 3 replays them before every manual pass. Not part of `npm test` or CI.
  - Before touching a form, call `waitForHydration(page)` (`tests/web-qa-scenarios/support/hydration.ts`) after each `page.goto`; it waits for `data-hydrated="true"`, which `shared/ui`'s `HydrationMarker` (rendered in the root layout) sets on `<body>`. A form inside its own Suspense boundary (sign-in, the add-poem form) hydrates after that marker, so retry its first interaction with `expect(…).toPass()`; sign in with `signIn(page, email)` from `support/sign-in.ts`, which already does.
  - A scenario must not leave data behind that another scenario reads: the seed accounts' poem counts are fixed (author1 none, author5 four). A flow that creates rows the app can't delete yet is checked by hand, not recorded.
