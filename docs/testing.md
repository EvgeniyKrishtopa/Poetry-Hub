# Testing

Read before writing or moving a test.

- Vitest + Testing Library (jsdom), as `*.test.ts(x)` in a `tests/` folder at the root of each feature or shared module, mirroring its structure (`features/home/tests/model/…`, `features/home/tests/components/HomeGreeting.test.tsx`, `shared/lib/contentful/tests/…`) — never mixed in with source files (`docs/decisions/0002-tests-folder-per-module.md`).
- Test pure `model/` logic directly; test components through user-visible behavior (roles, labels).
- `src/app/**` is excluded from coverage — route composition and async Server Components are verified by browser QA (`web-qa`) instead.
- Coverage threshold: 80% statements/lines/functions (`npm run test:coverage`).
- Browser QA flows a human chose to keep are recorded as `@playwright/test` scenarios in `tests/web-qa-scenarios/` (`npx playwright test`; `playwright.config.ts` starts the dev server). Gate 3 replays them before every manual pass. Not part of `npm test` or CI.
