# Tasks

## 1. Config and React Compiler <!-- judgement-heavy -->

- [x] 1.1 (FR-1, NFR-1) Ask the user to run `! npm install -D babel-plugin-react-compiler`; agents can't install packages. Then commit `next.config.ts` with `reactStrictMode: true`, `cacheComponents: true`, and `reactCompiler: true`, carrying only this change's hunks (design Risks: mixed working tree). Verify that `package.json` vs `main` adds only `babel-plugin-react-compiler` under `devDependencies`, and that `npm run typecheck` passes.

## 2. Contentful client caching <!-- judgement-heavy -->

- [x] 2.1 (FR-2, FR-3) Refactor `src/shared/lib/contentful/client.ts` per design D1:
  - add a `ContentfulOutcome` discriminated union;
  - add an inner `cachedContentfulRequest` (`"use cache"`, `cacheLife({ revalidate, expire: CONTENTFUL_CACHE_EXPIRE_SECONDS })` with the named constant `CONTENTFUL_CACHE_EXPIRE_SECONDS = 3600`, `cacheTag(...tags)`) that returns every failure instead of throwing;
  - keep `contentfulQuery` uncached, rebuilding the `ContentfulError` from a failed outcome;
  - remove the `fetch` `next` options;
  - leave the exported signature and `CONTENTFUL_CACHE_TAG` unchanged.

  Update `tests/client.test.ts`:
  - rely on the global `next/cache` mock from `vitest.setup.ts` (no file-level mock); import `cacheLife`/`cacheTag` and assert on them;
  - replace the three `lastInit().next` assertions with `cacheLife`/`cacheTag` assertions for both FR-2 scenarios;
  - add a test that `fetch` init has no `next`;
  - keep every failure-mapping test's `kind`/`status`/message assertions; replace only the network test's `cause instanceof TypeError` with a no-`cause` assertion (design D1).

  Add a global `vi.mock("next/cache", …)` to `vitest.setup.ts`: no-op `cacheLife`/`cacheTag`, `revalidateTag` as `vi.fn()` (design D4). Do not edit `src/app/api/revalidate/tests/route.test.ts`: its file-level `next/cache` mock overrides the global one. Confirm it passes untouched. Confirm `home-greeting.integration.test.ts` passes unchanged.

  Verify `npm run typecheck && npm run lint && npm run test:coverage` pass.

## 3. Home page <!-- judgement-heavy -->

- [x] 3.1 (FR-1, FR-4) In `src/app/(public)/page.tsx`, remove `export const revalidate = 60` and its comment block. Add `"use cache"`, `cacheLife("minutes")`, and `cacheTag(CONTENTFUL_CACHE_TAG)` at the top of the page body per design D2, with a short comment explaining why. Keep the body unchanged otherwise. Verify:
  - `npm run build` exits 0;
  - its route table lists `/` with revalidate `1m`;
  - `grep -rnE 'export const (revalidate|dynamic|fetchCache|dynamicParams)' src/app` prints nothing.
- [x] 3.2 (FR-5, FR-4) With valid Contentful config, check expiry on the production server (`npm run build && npm run start`):
  1. Request `/` twice and confirm the second response is served from the cache. The Contentful fetch is not repeated within 60 seconds, which shows in the server log or `x-nextjs-cache`.
  2. `curl -X POST` `/api/revalidate` with the correct secret, and confirm `200 {"revalidated":true}`.
  3. Confirm the next `/` request re-renders: a fresh Contentful fetch, or a changed title if one was published.
  4. If the page is not expired, stop and report: the page tags itself, so this would be a design-level surprise (design Risks).

  Also verify that, with the Contentful env unset, `/` renders the fallback greeting without an error.

  Then verify that a failed outcome is cached (FR-3). With an invalid `CONTENTFUL_ACCESS_TOKEN`, request `/` twice within 60 seconds on the production server. The server log shows exactly one `[contentful] home greeting failed` line, because the second request is served from the cache.

## 4. Docs and verification <!-- judgement-heavy -->

- [ ] 4.1 (FR-2, FR-4) Update `docs/state-management.md` and `docs/architecture.md` wherever they describe fetch-level or segment-level caching. Server caching is now `"use cache"` + `cacheLife` + `cacheTag`, and the `CLAUDE.md` literal-segment-config exception is no longer exercised by `/`. Update the `revalidate` example in `CLAUDE.md`'s "Name numeric and string constants" rule to mention `cacheLife` named profiles. Verify `npm run lint` passes.
- [ ] 4.2 (FR-1–FR-5, NFR-1, NFR-2) Run the full chain `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`; all must pass. Confirm that the edited test files plus `vitest.setup.ts`, compared with `main`, are exactly `src/shared/lib/contentful/tests/client.test.ts` and `vitest.setup.ts` (NFR-2). Run Gate 3 (`web-qa`) on `/`: the greeting heading, the poem search, and the list render; filtering works after hydration; `/does-not-exist` still shows the not-found screen. The loading screen need not be observed on the cached `/`. Check it through the dev tools' segment explorer where available; otherwise record in the QA report that it is covered by its unit test only (`route-states`).
