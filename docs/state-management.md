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

- **Data:** the shared client owns the cache scope. `contentfulQuery` caches each query in an inner `"use cache"` function, always tagged `CONTENTFUL_CACHE_TAG`; callers tune it through its `{ revalidate, tags }` argument. A DAL function adds no cache scope of its own.
- **Pages:** a page whose content is fully cacheable puts `"use cache"` at the top of its body with a named `cacheLife` profile (`cacheLife("minutes")`) and tags itself with the tags its webhook expires (see `app/(public)/page.tsx`). Nothing inside a cache scope may read cookies, headers, or the session — per-request UI sits outside it (Suspense-wrapped or client-only).
- **Crossing the boundary:** a cached function's arguments form the cache key, so never pass a secret — read it inside. Its return value is serialized, so return a plain result (a discriminated union) instead of throwing a class instance, and rebuild typed errors in an uncached wrapper (see `shared/lib/contentful/client.ts`).
- **Invalidation:** `revalidateTag(tag, { expire: 0 })` in a route handler (`app/api/revalidate`).
- **Tests:** `vitest.setup.ts` mocks `next/cache` globally (no-op `cacheLife`/`cacheTag`); `"use cache"` is an inert string under Vitest.

## Zustand conventions

- One small store per feature concern; no global god-store.
- Always read via selectors: `useStore((s) => s.field)` — never destructure the whole store.
- Stores are module singletons, so only use them in Client Components and only for client-only state. If a store ever needs server-provided initial data, switch to a per-request store created in a context provider.
