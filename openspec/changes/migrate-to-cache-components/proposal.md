# Proposal

## Why

The project is adopting Next.js 16 Cache Components (`cacheComponents: true`) and the React Compiler (`reactCompiler: true`). Both flags are in `next.config.ts`, uncommitted, and the app does not build with them.

- Under Cache Components, route segment config such as `export const revalidate = 60` on `/` is a build error. Caching moves to `"use cache"` with `cacheLife` and `cacheTag`.
- The Contentful client caches through `fetch`'s `next: { revalidate, tags }` options, which is the pre-Cache-Components model.
- The home page's TanStack Query prefetch and `dehydrate` read the current time. Cache Components rejects that during prerender outside a cache scope.
- `reactCompiler: true` needs the `babel-plugin-react-compiler` dev dependency, which is not installed.

This change makes the app build and behave as it does today under the new model: the same content, the same 60-second freshness, and the same instant expiry on a Contentful publish. It is a prerequisite for `add-supabase-auth`, which is paused until this change is merged.

## What Changes

- Commit `next.config.ts` with `cacheComponents: true` and `reactCompiler: true`. `reactStrictMode: true` is already the App Router default and is kept for explicitness.
- Add `babel-plugin-react-compiler` as a devDependency. The user installs it, because package installs are blocked for the agent.
- `src/shared/lib/contentful/client.ts`: `contentfulQuery` keeps its signature. Its caching moves from `fetch` `next` options to an inner `"use cache"` function with `cacheLife` and `cacheTag(CONTENTFUL_CACHE_TAG, …)`.
- `src/app/(public)/page.tsx`: remove `export const revalidate = 60`. Run the page body in `"use cache"` with `cacheLife("minutes")`, which revalidates after 60 seconds.
- Update the tests that assert the old `fetch` cache options, and the docs that describe the old model (`docs/state-management.md`, `docs/architecture.md` comments).

## Requirements

- **FR-1**: With `cacheComponents: true` and `reactCompiler: true` in `next.config.ts`, `npm run build` SHALL succeed. No route segment SHALL export `revalidate`, `dynamic`, `fetchCache`, or `dynamicParams`.
- **FR-2**: Every `contentfulQuery` result SHALL be cached on the server through `"use cache"`. The cache entry SHALL be tagged `contentful` (`CONTENTFUL_CACHE_TAG`) plus any caller-supplied tags.
  - Its lifetime SHALL be `cacheLife({ revalidate: <seconds>, expire: 3600 })`. The `revalidate` seconds come from the caller and default to 60; `expire` comes from the named constant `CONTENTFUL_CACHE_EXPIRE_SECONDS`.
  - The function's signature (`query`, `variables`, optional `{ revalidate?, tags? }`) and its typed-failure behavior SHALL be unchanged for callers.
  - The outgoing `fetch` SHALL carry no `next` cache options.
- **FR-3**: A Contentful failure SHALL still reach `contentfulQuery`'s caller as the same `ContentfulError` kind (`config`, `network`, `auth`, `graphql`, `http`) and status as before. This holds whether the failure happens inside or outside the cache scope. The error no longer carries a `cause`, deliberately, since no caller reads it.
  - A failed outcome SHALL be cached for the same lifetime as a success.
  - After a failure, the home page's best-effort safety net needs two request-driven refresh windows instead of one. The clock starts when the failure was cached. With a request after 60 s and another after a further 60 s, each completing its background refresh, the next request shows the CMS greeting. The exact wording is in the `home-greeting` spec delta. The publish notification still expires it immediately. This relaxation of `home-greeting`'s "Content freshness" requirement is recorded in this change's spec delta.
- **FR-4**: `/` SHALL be served from a cache entry with a 60-second revalidation interval (`cacheLife("minutes")`). The build route table SHALL show `/` with `Revalidate` `1m`. The rendered content SHALL be unchanged: the CMS greeting with its static fallback, plus the poem search and list hydrated from the server prefetch.
- **FR-5**: An accepted Contentful publish notification (`POST /api/revalidate`, `revalidateTag("contentful", { expire: 0 })`) SHALL expire the cached `/`, so the next request shows freshly fetched content. The page's cache scope SHALL tag itself `contentful` directly, not rely on nested-tag propagation.
- **NFR-1**: The React Compiler SHALL be active in the build. "Active" means three things: `reactCompiler: true` is set in `next.config.ts`, `babel-plugin-react-compiler` is a devDependency, and `npm run build` passes. Components the compiler silently skips are not hunted for. Only a build or test failure is treated as a finding. `babel-plugin-react-compiler` SHALL be a devDependency, and no runtime dependency SHALL be added.
- **NFR-2**: These existing behavior specs SHALL hold unchanged: `content-revalidation`, `route-states`, and `security-headers`. `home-greeting` SHALL also hold, except for the FR-3 relaxation.
  - All existing tests SHALL pass without modification, except the Contentful client tests rewritten for FR-2 and the network-`cause` assertion (FR-3).
  - `vitest.setup.ts` gains a global `next/cache` mock.

## Acceptance Criteria

- **FR-1** — Given the change is complete, When `npm run build` runs, Then it exits 0; and When `src/app` is searched for `export const (revalidate|dynamic|fetchCache|dynamicParams)`, Then there are no matches.
- **FR-2** — Given a caller passes no cache settings, When `contentfulQuery` runs, Then `cacheLife` is called with `{ revalidate: 60, expire: 3600 }` and `cacheTag` with `contentful`.
- **FR-2** — Given a caller passes `{ revalidate: 300, tags: ["poems"] }`, When `contentfulQuery` runs, Then `cacheLife` is called with `{ revalidate: 300, expire: 3600 }` and the applied tags are exactly `poems` and `contentful`.
- **FR-2** — Given any call, When the request is sent, Then the `fetch` init has no `next` property.
- **FR-3** — Given each existing failure scenario of the `contentful-client` spec (network, 401, GraphQL errors, HTTP 500, 200 without data, invalid config), When `contentfulQuery` runs, Then it rejects with a `ContentfulError` of the same `kind` (and `status`, where the scenario has one) as before, with no `cause`.
- **FR-3** — Given the real client runs under Vitest with Contentful env unset (`home-greeting.integration.test.ts`), When `getHomeGreeting` runs, Then it resolves to `{ ok: false, reason: "config" }` unchanged.
- **FR-4** — Given the change is complete, When `npm run build` runs, Then the route table lists `/` with revalidate `1m`.
- **FR-4** — Given the app runs with valid Contentful config, When a browser requests `/`, Then the greeting heading and the poem list render as before.
- **FR-4** — Given Contentful is unconfigured, When a browser requests `/`, Then the static fallback greeting renders and the page does not error.
- **FR-5** — Given `/` has been served once (cached) and the greeting title is then changed and published in Contentful, When a valid notification is POSTed to `/api/revalidate` and `/` is requested, Then that request shows the new title. (This is the deploy-time check already deferred as `add-contentful-home-greeting` 9.5. Locally it is verified by observing that the cache entry is rebuilt, as described in the design.)
- **NFR-1** — Given the change is complete, When `package.json` is diffed against `main`, Then `babel-plugin-react-compiler` is the only addition, under `devDependencies`, and `dependencies` is unchanged.
- **NFR-2** — Given the change is complete, When `npm run test:coverage` runs, Then every test passes, and the only edited test files are `src/shared/lib/contentful/tests/client.test.ts` and `vitest.setup.ts`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `contentful-client`: the "Cacheable responses" requirement now describes `"use cache"` + `cacheLife` + `cacheTag` instead of `fetch` revalidation options.
- `route-groups`: "Home page in the public group" no longer refers to `revalidate = 60`. `/` is cached via `"use cache"` with a 1-minute revalidation.
- `home-greeting`: "Content freshness" relaxes the best-effort safety net after a failed fetch from one to two revalidation windows. The publish-notification guarantee is unchanged.

## Out of Scope

- `add-supabase-auth` and any session-aware rendering.
- Partial prerendering of user-specific UI. `/` stays fully cached.
- Custom `cacheLife` profiles in `next.config.ts`. The built-in `minutes` profile is used.
- React Compiler lint rules or opting individual components out of the compiler. They are added only if the build or tests surface a problem.
- Committing `add-supabase-auth`'s dependency installs (`@supabase/*`, `next-safe-action`) or its `.env.example` edits. They stay in the working tree for that change.

## Impact

- Changed: `next.config.ts`, `package.json` / `package-lock.json` (devDependency), `src/shared/lib/contentful/client.ts` and its tests, `src/app/(public)/page.tsx`, `vitest.setup.ts`, `docs/state-management.md`, `docs/architecture.md`, and `CLAUDE.md` (the literal-segment-config exception becomes a `cacheLife` named-profile note).
- Tests: `vitest.setup.ts` mocks `next/cache` globally, because `cacheLife` and `cacheTag` throw outside a Next cache scope.
- No new URLs, env vars, or runtime dependencies.
