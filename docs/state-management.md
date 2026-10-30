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

No feature uses TanStack Query today: the home page's poem list was its only consumer and was removed in `add-author-poems`. Poems moved to the database in `add-poem-creation` and still need none: every poem page is server-rendered from the Next.js cache, and nothing on the client refetches or filters a list (user decision, 2026-10-28: stay on server rendering until search arrives). `app/providers.tsx` still mounts the client, and these conventions stay for the next feature that fetches on the client.

- Define a key factory per feature (`<name>Keys`) and export `queryOptions(...)` objects; hooks wrap those options.
- The same `queryOptions` are used for server prefetching (`prefetchQuery` + `HydrationBoundary` in a Server Component page) and for client hooks.
- Use `getQueryClient()` from `@/shared/lib/query-client` — per-request on the server, singleton in the browser.
- Fetchers in `*.api.ts` are plain async functions returning typed data; they know nothing about React.

## Server-only data (DAL)

- Data that needs a secret and is consumed only by Server Components goes through a module in `features/<name>/dal/` (e.g. `dal/home-greeting.ts` — the folder names the role, so no `.dal.ts` suffix): starts with `import "server-only"`, validates the response with a Zod schema from `model/`, and returns a typed result. Never wrap it in `queryOptions` or client hooks — a client refetch would need the secret.
- The page awaits the DAL and passes plain values to synchronous presentational components (Vitest can't render async Server Components).
- A mock DAL that reads no data and no clock needs no cache scope, only React's `cache` when page and trail share a read. When a database replaces the mock, the DAL adds its own result-dependent scope and an `unavailable` reason, per the Supabase public reads below — as `features/poems/dal/author-poems.ts` did in `add-poem-creation`.

## Server caching (Cache Components)

`cacheComponents: true` is on, so server caching is `"use cache"` + `cacheLife` + `cacheTag` from `next/cache` — never `fetch`'s `next` options or route segment config (`export const revalidate`, `dynamic`, …), which Cache Components rejects.

- **Data:** the shared client owns the cache scope. `contentfulQuery` caches each query in an inner `"use cache"` function, always tagged `CONTENTFUL_CACHE_TAG`; callers tune it through its `{ revalidate, tags }` argument. A Contentful DAL function adds no cache scope of its own (Supabase public reads differ: see below). Exception: a Contentful read whose failure must not be kept for the client's default lifetime owns a result-dependent scope in its DAL: `"use cache"`, `cacheTag(CONTENTFUL_CACHE_TAG)`, then a longer named profile on success and `"seconds"` on failure, so an env-less build or an outage stays a request-time hole instead of freezing into the prerendered shell. The read returns failures as plain values. Two shapes: a page that throws to the error screen on failure (the component throws after the scope; `features/content-page/dal/content-page.ts`, `"minutes"` on success, keyed by the entry key, so each page caches its own entry), and a fallback read whose callers degrade instead of throwing (`features/poems/dal/poem-genres.ts`, `"hours"` on success: the add form shows a «genres unavailable» alert, a poem page leaves its genre line out).
- **Pages:** a page whose content is fully cacheable puts `"use cache"` at the top of its body with a named `cacheLife` profile (`cacheLife("minutes")`) and tags itself with the tags its webhook expires (see `app/(public)/page.tsx`). Nothing inside a cache scope may read cookies, headers, or the session — per-request UI sits outside it (Suspense-wrapped or client-only).
- **Components:** a Server Component that reads no request data may own its cache scope: `"use cache"` at the top of its body with a named `cacheLife` profile. Use it when the component needs a value Cache Components only allows inside a cache scope, such as `new Date()`, and it renders on pages with their own lifetimes. Example: `SiteFooter` (`features/site-footer`) reads the year under `cacheLife("days")`. A page's shell lives as long as its shortest cache scope, so a page with a shorter profile of its own keeps it (`/` stays at 1 minute), while a page with none now revalidates daily (`/login`, `/account`, …). Pick the longest profile the value allows.
- **Crossing the boundary:** a cached function's arguments form the cache key, so never pass a secret — read it inside. Its return value is serialized, so return a plain result (a discriminated union) instead of throwing a class instance, and rebuild typed errors in an uncached wrapper (see `shared/lib/contentful/client.ts`).
- **Invalidation:** `revalidateTag(tag, { expire: 0 })` in a route handler (`app/api/revalidate`) for a CMS publish; `updateTag(tag)` in a Server Action for the reader's own write (below).
- **Tests:** `vitest.setup.ts` mocks `next/cache` globally (no-op `cacheLife`/`cacheTag`); `"use cache"` is an inert string under Vitest.

### Supabase public reads

Public Supabase data (the author directory and pages, `features/authors/dal/public-authors.ts`; an author's poems, `features/poems/dal/author-poems.ts`) departs from the Contentful rules above in two places:

- **The client:** `createSupabasePublicClient()` from `@/shared/lib/supabase/public` — cookie-less, anon role, so RLS returns only public rows. It reads no request data, which is what lets it run inside `"use cache"`. Never use the cookie client (`/server`) in a cache scope.
- **The feature DAL owns the cache scope.** Each read opens its own `"use cache"` around the query, the Zod parse, and the row mapping, because the lifetime depends on the result and is set after the read: `cacheLife("hours")` for a hit, `"minutes"` for not-found, `"seconds"` for unavailable — so a Supabase blip or an env-less build heals itself instead of freezing into the prerendered shell. Failures are returned as plain values, never thrown, and the scope always carries its tag. Validate an id argument (a UUID) before calling the cached function, so junk never becomes a cache key. Don't throw inside the scope to keep a failure out of the cache: a throw during prerender fails the build even when the caller catches it, Next logs it a second time, and a failed refresh still doesn't keep the stale entry (`add-author-poems` design D14).
- **One read per request for shared entities** (ADR 0008). A read that a page and its breadcrumb trail both call is wrapped in React's `cache` (`export const getPublicAuthor = cache(async (id) => …)`), so every caller in the request shares one result and page and trail can't disagree. Derived reads (`getPublicAuthorName`) call the memoized function. **One tag per author for poems:** an author's whole list is one cached entry (`cachedAuthorPoems`, tagged `poemsTag(authorId)`), and `getAuthorPoem` finds the poem in it, so the public author page, the public poem page, `/account/poems`, and `/account/poems/<id>` read the same entry and a new poem expires one tag. Tests mock `react`'s `cache` with a per-test memo: Vitest runs the client React build, whose `cache` doesn't memoize.
- **Invalidation from the owner's write:** `updateTag(tag)` in the Server Action that wrote, so the action's own re-render already reads the new data. `revalidateTag(tag, { expire: 0 })` stays for writes that arrive outside a Server Action (a route handler, a CMS webhook) — `updateTag` works only inside a Server Action.
- **A write that expires a public tag goes through the per-user write limit first** (ADR 0007): after the session check and before any other I/O, the action calls its feature's allowance DAL (`features/authors/dal/write-allowance.ts`, the `consume_write_allowance(scope)` database function). An attempt over the limit writes nothing and expires no tag, so one account's save loop can't keep the public pages uncached. **Variant for a write that creates rows** (ADR 0009, amended by ADR 0010): the `security definer` function that inserts counts the caller's creations (a creation log a trigger fills, so a deleted row still counts) in a sliding window under a per-author advisory lock and refuses over the limit (`create_my_poem`, 100 poems per 30 days), so no client can skip the check. The action still asks first, before any upload, with a read-only twin (`can_create_poem()`), and expires the tag only after the insert succeeded.

## Zustand conventions

- One small store per feature concern; no global god-store.
- Always read via selectors: `useStore((s) => s.field)` — never destructure the whole store.
- Hold ids and flags, never server data. Example: `features/poem-management/model/created-poem-notice-ui.store.ts` keeps only the id of the poem just created, so the success notice survives the one client-side navigation to the poem page; the notice snapshots it on first render and clears it, so a reload or a later visit shows nothing (a `?created=1` query flag would repeat on reload and leak into shared links). One-time notices read their store through `useOneTimeValue` (`shared/lib/one-time-notice`), which also picks up a new value when Next reveals an `Activity`-hidden route again.
- Exception, server data held briefly: `features/poem-management/model/deleted-poem-notice-ui.store.ts` holds the deleted poem's title (with the outcome, `deleted` or `already-deleted`) from the confirm click until the notice on `/account/poems` first renders, then it is cleared. The poem is gone from the server by then, so there is nothing to refetch, and a `?deleted=…` query flag would repeat on reload and leak the title into links and history (`delete-poem` design D5).
- Exception, a store in `shared/`: `shared/lib/one-time-notice/session-expired-notice.store.ts` is a boolean flag that `poem-management`'s delete button sets when a write finds the session expired, and `auth`'s `SessionExpiredNotice` reads on `/login`. Writer and reader are different features, and `auth`'s index is server-only, so the store can't live in either feature's `model/`. It holds no data, and any future write that finds the session expired may set it (`delete-poem` design D6).
- Stores are module singletons, so only use them in Client Components and only for client-only state. If a store ever needs server-provided initial data, switch to a per-request store created in a context provider.
