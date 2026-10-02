# Test Plan

| Requirement | Tests | Level |
| --- | --- | --- |
| FR-1 (build exits 0) | Production build with `cacheComponents` and `reactCompiler` on succeeds (task 3.1, 4.2 chain) | integration |
| FR-1 (no segment cache config) | Static check: grep `src/app` for `export const (revalidate\|dynamic\|fetchCache\|dynamicParams)` returns nothing (task 3.1) | integration |
| FR-2 (defaults → `cacheLife({ revalidate: 60, expire: 3600 })` + tag `contentful`) | Client unit test: no cache settings → the mocked `cacheLife` receives `{ revalidate: 60, expire: 3600 }`, and `cacheTag` receives exactly `contentful` | unit |
| FR-2 (caller settings → `{ revalidate: 300, expire: 3600 }`, tags `poems` + `contentful`) | Client unit test: `{ revalidate: 300, tags: ["poems"] }` → `cacheLife` receives `{ revalidate: 300, expire: 3600 }`, and the tags applied are exactly `poems` and `contentful` | unit |
| FR-2 (fetch init has no `next`) | Client unit test: the captured `fetch` init has no `next` property | unit |
| FR-3 (each failure keeps its `kind`/`status`, no `cause`) | Client unit tests (existing failure cases; only the network `cause` assertion is rewritten): network, 401, GraphQL errors, HTTP 500, 200 without data, invalid config → `ContentfulError` with the same `kind`/`status`, and `cause` is undefined | unit |
| FR-3 (real client, env unset → `{ ok: false, reason: "config" }`) | Existing home-greeting integration test, unchanged, passes with the global `next/cache` mock | integration |
| FR-4 (route table lists `/` with revalidate `1m`) | Production build route table inspected for `/` → `1m` (task 3.1) | integration |
| FR-4 (valid config → greeting heading + poem list render as before) | Browser QA on `/`: the greeting heading, poem search, and list render; filtering works after hydration (task 4.2, Gate 3) | end-to-end |
| FR-4 (Contentful unconfigured → fallback greeting, no error) | Production server with the Contentful env unset: `/` renders the static fallback greeting and no error screen (task 3.2) | end-to-end |
| FR-5 (publish notification → next `/` request is fresh) | Production server: serve `/`, POST `/api/revalidate` with the valid secret → 200, and the next `/` re-renders with a fresh Contentful fetch or the changed title (task 3.2); also the deferred live check `add-contentful-home-greeting` 9.5 at deploy | end-to-end |
| FR-3 / design D1 (a failed outcome is cached) | Production server with an invalid token: two `/` requests within 60 s log exactly one `[contentful] home greeting failed` line (task 3.2) | end-to-end |
| NFR-1 (only `babel-plugin-react-compiler` added, under devDependencies) | Static check: `package.json` diff vs `main` shows one devDependency addition and no `dependencies` change (tasks 1.1, 4.2) | integration |
| NFR-2 (all tests pass; only `client.test.ts` and `vitest.setup.ts` edited) | Full `test:coverage` run passes, and a diff of test files plus `vitest.setup.ts` vs `main` lists exactly those two (task 4.2) | integration |
