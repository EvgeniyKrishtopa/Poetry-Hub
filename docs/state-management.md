# State management

Read before fetching data, adding a store, or passing data from a Server Component to the client.

| Kind of state | Where it lives |
| --- | --- |
| Server data (anything fetched) | TanStack Query — never copy it into Zustand |
| Server-only data rendered only by Server Components (CMS content, anything needing a secret) | The feature's `dal/` folder — see below |
| Client UI state (filters, search, toggles, modals) | Zustand store in `features/<name>/model/<name>-ui.store.ts` |
| Local component state | `useState` |
| Form state | local state (add a form library only when needed) |
| Derived values | computed during render / in pure functions — never stored |

## TanStack Query conventions

- Define a key factory per feature (`poemsKeys`) and export `queryOptions(...)` objects; hooks wrap those options.
- The same `queryOptions` are used for server prefetching (`prefetchQuery` + `HydrationBoundary` in a Server Component page) and for client hooks.
- Use `getQueryClient()` from `@/shared/lib/query-client` — per-request on the server, singleton in the browser.
- Fetchers in `*.api.ts` are plain async functions returning typed data; they know nothing about React.

## Server-only data (DAL)

- Data that needs a secret and is consumed only by Server Components goes through a module in `features/<name>/dal/` (e.g. `dal/home-greeting.ts` — the folder names the role, so no `.dal.ts` suffix): starts with `import "server-only"`, validates the response with a Zod schema from `model/`, and returns a typed result. Never wrap it in `queryOptions` or client hooks — a client refetch would need the secret.
- The page awaits the DAL and passes plain values to synchronous presentational components (Vitest can't render async Server Components).

## Server caching (Cache Components)

`cacheComponents: true` is on, so server caching is `"use cache"` + `cacheLife` + `cacheTag` from `next/cache` — never `fetch`'s `next` options or route segment config (`export const revalidate`, `dynamic`, …), which Cache Components rejects.

- **Data:** the shared client owns the cache scope. `contentfulQuery` caches each query in an inner `"use cache"` function, always tagged `CONTENTFUL_CACHE_TAG`; callers tune it through its `{ revalidate, tags }` argument. A Contentful DAL function adds no cache scope of its own (Supabase public reads differ: see below). Exception: a Contentful page that must throw to the error screen on failure, instead of falling back, owns a result-dependent scope in its DAL: `"use cache"`, `cacheTag(CONTENTFUL_CACHE_TAG)`, then `cacheLife("minutes")` on success and `"seconds"` on failure, so an env-less build or an outage stays a request-time hole instead of freezing into the prerendered shell. The read returns failures as plain values; the component throws after the scope. Example: `features/content-page/dal/content-page.ts`, whose scope is keyed by the entry key (its argument), so each page caches its own entry.
- **Pages:** a page whose content is fully cacheable puts `"use cache"` at the top of its body with a named `cacheLife` profile (`cacheLife("minutes")`) and tags itself with the tags its webhook expires (see `app/(public)/page.tsx`). Nothing inside a cache scope may read cookies, headers, or the session — per-request UI sits outside it (Suspense-wrapped or client-only).
- **Components:** a Server Component that reads no request data may own its cache scope: `"use cache"` at the top of its body with a named `cacheLife` profile. Use it when the component needs a value Cache Components only allows inside a cache scope, such as `new Date()`, and it renders on pages with their own lifetimes. Example: `SiteFooter` (`features/site-footer`) reads the year under `cacheLife("days")`. A page's shell lives as long as its shortest cache scope, so a page with a shorter profile of its own keeps it (`/` stays at 1 minute), while a page with none now revalidates daily (`/login`, `/account`, …). Pick the longest profile the value allows.
- **Crossing the boundary:** a cached function's arguments form the cache key, so never pass a secret — read it inside. Its return value is serialized, so return a plain result (a discriminated union) instead of throwing a class instance, and rebuild typed errors in an uncached wrapper (see `shared/lib/contentful/client.ts`).
- **Invalidation:** `revalidateTag(tag, { expire: 0 })` in a route handler (`app/api/revalidate`) for a CMS publish; `updateTag(tag)` in a Server Action for the reader's own write (below).
- **Tests:** `vitest.setup.ts` mocks `next/cache` globally (no-op `cacheLife`/`cacheTag`); `"use cache"` is an inert string under Vitest.

### Supabase public reads

Public Supabase data (the author directory and pages, `features/authors/dal/public-authors.ts`) departs from the Contentful rules above in two places:

- **The client:** `createSupabasePublicClient()` from `@/shared/lib/supabase/public` — cookie-less, anon role, so RLS returns only public rows. It reads no request data, which is what lets it run inside `"use cache"`. Never use the cookie client (`/server`) in a cache scope.
- **The feature DAL owns the cache scope.** Each read opens its own `"use cache"` around the query, the Zod parse, and the row mapping, because the lifetime depends on the result and is set after the read: `cacheLife("hours")` for a hit, `"minutes"` for not-found, `"seconds"` for unavailable — so a Supabase blip or an env-less build heals itself instead of freezing into the prerendered shell. Failures are returned as plain values, never thrown, and the scope always carries its tag. Validate an id argument (a UUID) before calling the cached function, so junk never becomes a cache key. Don't throw inside the scope to keep a failure out of the cache: a throw during prerender fails the build even when the caller catches it, Next logs it a second time, and a failed refresh still doesn't keep the stale entry (`add-author-poems` design D14).
- **One read per request for shared entities** (ADR 0008). A read that a page and its breadcrumb trail both call is wrapped in React's `cache` (`export const getPublicAuthor = cache(async (id) => …)`), so every caller in the request shares one result and page and trail can't disagree. Derived reads (`getPublicAuthorName`) call the memoized function. Tests mock `react`'s `cache` with a per-test memo: Vitest runs the client React build, whose `cache` doesn't memoize.
- **Invalidation from the owner's write:** `updateTag(tag)` in the Server Action that wrote, so the action's own re-render already reads the new data. `revalidateTag(tag, { expire: 0 })` stays for writes that arrive outside a Server Action (a route handler, a CMS webhook) — `updateTag` works only inside a Server Action.
- **A write that expires a public tag goes through the per-user write limit first** (ADR 0007): after the session check and before any other I/O, the action calls its feature's allowance DAL (`features/authors/dal/write-allowance.ts`, the `consume_write_allowance(scope)` database function). An attempt over the limit writes nothing and expires no tag, so one account's save loop can't keep the public pages uncached.

## Zustand conventions

- One small store per feature concern; no global god-store.
- Always read via selectors: `useStore((s) => s.field)` — never destructure the whole store.
- Stores are module singletons, so only use them in Client Components and only for client-only state. If a store ever needs server-provided initial data, switch to a per-request store created in a context provider.
