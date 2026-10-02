# Design

## Context

Today (`main`), the home page `/` is cached in two independent layers:

- **Route ISR.** `src/app/(public)/page.tsx` exports `revalidate = 60`, so the rendered page is cached and regenerated at most every 60 seconds.
- **Data cache.** `contentfulQuery` (`src/shared/lib/contentful/client.ts`) passes `next: { revalidate, tags }` to `fetch`, so the Contentful response is cached and tagged `contentful`.
- **Publish webhook.** The webhook (`POST /api/revalidate`) calls `revalidateTag("contentful", { expire: 0 })`. That expires the data cache, and with it every page that used the data.
- **Failure handling.** `getHomeGreeting` (`features/home/dal`) turns every `ContentfulError` into a fallback result, so the page never throws because of Contentful.

With `cacheComponents: true`, Next.js 16 (bundled docs, "Migrating to Cache Components"):

- rejects route segment config (`revalidate`, `dynamic`, `fetchCache`, `dynamicParams`) at build time;
- does not cache `fetch` by default; caching is opted into with `"use cache"` on a function or component, a lifetime from `cacheLife(...)`, and tags from `cacheTag(...)`;
- fails the prerender when a Server Component reads the current time (`Date.now()`) outside a cache scope. TanStack Query's `prefetchQuery`/`dehydrate` do exactly that (Next's TanStack Query guide);
- `revalidateTag(tag, profile)` expires `cacheTag`-tagged entries the same way it expired tagged fetches;
- the built-in `cacheLife("minutes")` profile is `stale` 5 min, `revalidate` 1 min, `expire` 1 h.

`cacheLife`/`cacheTag` throw when called outside a Next cache scope. That includes Vitest, so unit tests mock `next/cache`.

## Goals / Non-Goals

**Goals:** the app builds with `cacheComponents` and `reactCompiler`; `/` keeps its content, its 60-second freshness and its instant expiry on publish; `contentfulQuery`'s public contract is unchanged.

**Non-Goals:** session-aware rendering, custom cache profiles, React Compiler lint configuration (see proposal Out of Scope).

## Decisions

### D1 — `contentfulQuery`: an uncached wrapper around a cached inner function that returns a result

```ts
// client.ts (shape, not final code)
async function cachedContentfulRequest(
  query: string,
  variables: Readonly<Record<string, unknown>>,
  revalidateSeconds: number,
  tags: readonly string[],
): Promise<ContentfulOutcome> {
  "use cache";
  cacheLife({ revalidate: revalidateSeconds, expire: CONTENTFUL_CACHE_EXPIRE_SECONDS });
  cacheTag(...tags);
  // getContentfulConfig() + fetch + parse; every failure is RETURNED as { ok: false, kind, message, status? }
}

export async function contentfulQuery(query, variables, cache?): Promise<unknown> {
  const tags = [...new Set([...(cache?.tags ?? []), CONTENTFUL_CACHE_TAG])];
  const outcome = await cachedContentfulRequest(query, variables, cache?.revalidate ?? DEFAULT_REVALIDATE_SECONDS, tags);
  if (!outcome.ok) throw new ContentfulError(outcome.kind, outcome.message, { status: outcome.status });
  return outcome.data;
}
```

- **Why return failures instead of throwing inside the cache scope.** The callers' contract (FR-3) depends on `error instanceof ContentfulError` in `getHomeGreeting`. A value that crosses a `"use cache"` boundary is serialized, so whether a thrown class instance keeps its identity is a framework detail this design should not depend on.
  - A plain `ContentfulOutcome` object (a discriminated union, defined next to the client) always survives serialization.
  - The uncached wrapper rebuilds the typed `ContentfulError` outside the boundary. FR-3 then holds by construction.
- **`cause` is dropped on purpose (Gate 1 #1).** A `TypeError` from a failed `fetch` cannot cross the cache boundary reliably, and no caller reads `cause`: `getHomeGreeting` logs only `kind` and `status`. A rebuilt `ContentfulError` therefore has no `cause`. The client test asserting `cause instanceof TypeError` is rewritten to assert `kind: "network"` and no token in the message.
- **Accepted consequence: a failure is cached like a success, for the same lifetime (Gate 1 #3, user decision 2026-10-02).** This is a behaviour change. Today a network failure, a timeout, or a config failure writes no data-cache entry, so the next ISR regeneration fetches again.
  - Now the failed outcome is a cache entry with the same 60-second revalidation. With stale-while-revalidate at both the page and inner levels, a page built from a failure can keep showing the fallback for up to **two** revalidation windows (about 120 seconds) before the CMS greeting returns.
  - The publish webhook still expires both entries immediately.
  - **The two-window recovery is not specific to failures (Gate 2 P1).** It comes from nested stale-while-revalidate itself. The page and inner entries are created in the same render, so a background page refresh can read the still-stale inner entry, and only then refresh it. A *successful* greeting changed in Contentful without a delivered notification can therefore also take two request-driven windows to show. The `home-greeting` delta's safety-net wording covers both cases.
  - The `home-greeting` "Content freshness" safety net is relaxed accordingly, by a spec delta in this change.
  - *Rejected:* choosing a short failure lifetime once the outcome is known. Short-lived caches (expiring in under 5 minutes) are excluded from prerender. CI builds have no Contentful env, so the failure path runs at build time, and `/` would become dynamic or fail to prerender.
- **The cache key holds no secrets.** The arguments (`query`, `variables`, `revalidateSeconds`, `tags`) form the key. The token is read inside, from `getContentfulConfig()`, and is never an argument.
- **`fetch` no longer carries `next`.** Caching is the `"use cache"` scope's job. The request timeout (`AbortSignal.timeout`) is unchanged.
- **`cacheLife({ revalidate, expire })`, not a named profile (Gate 1 #5).** Callers may pass any number of seconds (the existing contract).
  - `expire` is set explicitly to `CONTENTFUL_CACHE_EXPIRE_SECONDS = 3600`, the same as the `"minutes"` profile's 1 hour. After an idle hour the next request therefore blocks on fresh data instead of inheriting the default profile's much longer expiry.
  - `stale` (the client router's reuse window) is left to its default.
  - The implementer confirms `npm run build` accepts the object form. If typecheck requires `stale` as well, it is added from a named constant (`300`, matching `"minutes"`).
- *Alternative:* cache only at the page level and leave the client uncached. Rejected: it breaks the `contentful-client` contract ("every query SHALL be cached"). Under Cache Components a future caller would also get an uncached `fetch`, and a prerender error with it.

### D2 — `/`: the whole page body runs in `"use cache"` with `cacheLife("minutes")`

```tsx
// src/app/(public)/page.tsx (shape)
export default async function HomePage() {
  "use cache";
  // Cache Components replaces `export const revalidate = 60` (rejected at build) with a cache scope;
  // "minutes" = revalidate every 60 s, matching the Contentful client's default.
  cacheLife("minutes");
  // … unchanged body: getHomeGreeting() + prefetchQuery(poemsListQueryOptions) → HydrationBoundary
}
```

- **Why the page needs its own scope.** The prefetch/dehydrate pair reads `Date.now()`, which is a prerender error outside a cache scope. Wrapping the page body is the smallest change that covers it, and the whole page is already cacheable: mock poems plus cached CMS content, nothing per-request. It is also the direct equivalent of the route ISR it replaces.
- **The page tags itself (Gate 1 #4).** The page body calls `cacheTag(CONTENTFUL_CACHE_TAG)` directly, so `revalidateTag("contentful", { expire: 0 })` expires the page entry (FR-5). It does not rely on nested-tag propagation, which is a framework detail, consistent with D1's stance. `app/` already imports that constant in `api/revalidate/route.ts`. Task 3.2 still verifies the end-to-end expiry locally.
- **Lifetime.** The page entry takes the shortest lifetime among itself and nested scopes: `minutes`, and the inner `{ revalidate: 60 }`. So `/` revalidates every 60 seconds, and the build table shows `1m`.
- *Alternative:* the Next guide's `dehydrate` helper, which caches only the timestamp in a tagged `"use cache"` function and keeps the page uncached. Rejected for now: it adds a shared helper for one page whose content is entirely cacheable. Revisit when a page mixes cached and per-request data. The likely first case is `add-supabase-auth`'s session-aware views, though its header widget is client-only by design.
- **Placement in `app/`.** `cacheLife` in a route file is routing-level config (how long this page lives), the same role the `revalidate` export had. The `CLAUDE.md` rule that "Next.js route segment config must be a literal" applied to `revalidate`. `cacheLife("minutes")` is a named profile, so no magic number appears in the page.

### D3 — React Compiler

`reactCompiler: true` with `babel-plugin-react-compiler` as a devDependency (Next's documented setup). Installation is blocked for the agent, so the user runs `! npm install -D babel-plugin-react-compiler`.
- No code is adapted ahead of time. If the compiler skips or breaks a component, the build or tests will show it, and the fix is scoped to that finding.
- `reactStrictMode: true` is kept. It is already the App Router default and costs nothing.

### D4 — Tests

- **A global `next/cache` mock in `vitest.setup.ts` (Gate 1 #2).** `vi.mock("next/cache", …)` with no-op `cacheLife` and `cacheTag`, and `revalidateTag` kept as a `vi.fn()`.
  - This covers `home-greeting.integration.test.ts`, which runs the real `contentfulQuery`. Without the mock, `cacheLife` would throw outside a Next scope, and `getHomeGreeting` would rethrow.
  - It also covers any future real-client caller. The `"use cache"` directive is an inert string under Vitest, so the inner function runs directly.
  - Tests that assert on these calls import the mocked functions and inspect them.
  - `src/app/api/revalidate/tests/route.test.ts` keeps its own file-level `vi.mock("next/cache", …)` and is **not edited**. A file-level `vi.mock` overrides the setup-file mock for that file. The implementer only confirms the test passes untouched (clarify finding 1).
- `client.test.ts`:
  - The three old cache-option tests become `cacheLife`/`cacheTag` assertions (FR-2), plus a test that `fetch` init has no `next`.
  - The existing failure tests keep their `kind`/`status`/message assertions (FR-3); they exercise the outcome → `ContentfulError` round trip. The one exception is the network test's `cause instanceof TypeError` assertion, which is replaced per D1.
- `home-greeting` DAL tests mock `contentfulQuery` and need no change (NFR-2).
- `src/app/**` stays excluded from coverage. FR-4/FR-5 are verified by `npm run build` (route table) and by Gate 3 / manual checks.

## Flow — request for `/` and publish expiry

```mermaid
sequenceDiagram
    actor Reader
    participant Next as Next.js server (Cache Components)
    participant Page as HomePage ("use cache", minutes)
    participant DAL as getHomeGreeting
    participant CQ as contentfulQuery (uncached wrapper)
    participant Inner as cachedContentfulRequest ("use cache", tag contentful)
    participant CF as Contentful GraphQL API
    actor Editor
    participant Hook as POST /api/revalidate

    Reader->>Next: GET /
    alt page entry fresh
        Next-->>Reader: cached HTML/RSC
    else page entry stale (past revalidate, before expire)
        Next-->>Reader: stale cached HTML/RSC (served immediately)
        Next--)Page: background re-render (same steps as below)
    else page entry missing / expired
        Next->>Page: render
        Page->>DAL: getHomeGreeting()
        DAL->>CQ: contentfulQuery(query, vars)
        CQ->>Inner: (query, vars, 60, [contentful])
        alt inner entry fresh
            Inner-->>CQ: cached outcome
        else inner entry stale
            Inner-->>CQ: stale cached outcome (may be a cached failure; why recovery can take two windows)
            Inner--)CF: background refetch → entry replaced
        else miss / expired
            Inner->>CF: POST GraphQL (timeout 5 s)
            alt 200 with data
                CF-->>Inner: data
                Inner-->>CQ: { ok: true, data } (cached)
            else network / 401 / GraphQL errors / non-2xx / no data / config invalid
                Inner-->>CQ: { ok: false, kind, message, status? } (cached, same lifetime)
            end
        end
        alt outcome ok
            CQ-->>DAL: data
            DAL-->>Page: { ok: true, greeting } (after schema validation)
        else outcome failed
            CQ-->>DAL: throw ContentfulError(kind)
            DAL-->>Page: { ok: false, reason } → fallback greeting (logged once)
        end
        Page->>Page: cacheTag(contentful); prefetchQuery(poems) + dehydrate (Date.now inside cache scope)
        Page-->>Next: rendered entry (tags: contentful; revalidate 60 s)
        Next-->>Reader: HTML/RSC
    end
    Editor->>CF: publish entry
    CF->>Hook: webhook (secret header)
    alt secret valid
        Hook->>Next: revalidateTag("contentful", { expire: 0 })
        Hook-->>CF: 200 { revalidated: true }
        Note over Next: inner + page entries expired; next GET / re-renders with fresh data
    else secret wrong / missing → 401; not configured → 503
        Hook-->>CF: error status, nothing expired
    end
```

## Risks / Trade-offs

- **Webhook expiry of the page.** The page tags itself (D2), so FR-5 does not depend on nested-tag propagation. Task 3.2 verifies it end to end on a production server.
- **Failures are cached, and recovery takes up to two windows.** See D1. This is a deliberate relaxation of the `home-greeting` safety net, recorded in this change's spec delta. The webhook still clears it immediately.
- **The `cacheLife({ revalidate, expire })` object form.** If typecheck requires `stale`, it is added from a named constant. See D1.
- **React Compiler surprises.** These are unknown until the first build. Each one is scoped to its own finding and never pre-emptively worked around.
- **Mixed working tree.** The working tree on `feature/add-auth-flow` holds `add-supabase-auth`'s dependency installs (`@supabase/*`, `next-safe-action`), its `.env.example` edits, and this change's `next.config.ts` edit.
  - The implementing branch for this change starts from `main` and carries only this change's hunks. Those hunks are `next.config.ts` and the new devDependency.
  - The user decides how to stash or carry the auth branch's uncommitted edits; nothing is discarded automatically.

## Migration Plan

1. The user installs the compiler plugin: `! npm install -D babel-plugin-react-compiler`.
2. Apply the config, the client change, the page change, and the tests.
3. `npm run build` passes, and `/` shows `1m`.
4. Locally verify webhook expiry against the production server (task 3.2).

Rollback: revert the merge commit. That restores `revalidate = 60` and the fetch-level caching, with both flags off.
