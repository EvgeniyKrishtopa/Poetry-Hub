# 0011. Private reader data is read uncached under RLS and kept fresh with `refresh()`

## Status

Accepted (2026-11-06)

Amended by 0012 (Decision 1, for a private column on a public table: see ADR 0012)

## Context

Every Supabase read so far serves public data: an author's profile, an author's poems. Those reads run
through the cookie-less public client inside a `"use cache"` scope, tagged, and a write expires its tag
with `updateTag` (ADR 0005, ADR 0008, `docs/state-management.md`). Even `/account/poems` reads the
author's poems from that public cache, because the same poems are public.

`add-poem-collections` adds the first data that only its owner may ever see: collections. RLS lets a
signed-in reader read only their own rows, and `anon` reads nothing (that change's NFR-1). The public
pattern doesn't fit: a `"use cache"` scope can't read the session cookie, so a cached read could only use
the anon client, which RLS gives no rows; and an entry only one reader ever reads would gain nothing from
being shared. Details: `add-poem-collections` design D4 and D10 (Gate 1 P6 asked for this record, since
the pattern outlives the change).

## Decision

1. **A read of private reader data opens no cache scope.** It runs in the feature's `dal/` through the
   cookie client (`@/shared/lib/supabase/server`), so RLS limits the rows to the caller, and filters by
   the caller's own author id as well. Results are Zod-parsed and returned as plain values; a failure is
   `unavailable`, never thrown from the DAL.
2. **The page reads it at request time inside its Suspense boundary.** The shell (static heading,
   skeleton) still prerenders, so the route builds as partially prerendered with no route segment
   config.
3. **A read shared by page and trail is still wrapped in React's `cache`** (ADR 0008), so both get one
   result per request (`getOwnCollection`, `getOwnCollectionTitle`).
4. **Freshness comes from `refresh()`, not tags.** Nothing private is tagged, so every successful write
   calls `refresh()` from `next/cache` inside its Server Action, which drops the client router's copies
   of the pages it kept (including Next's `Activity`-hidden routes); the next render reads the database
   again. A refused or failed write does not refresh.
5. **A private write that updates rows still takes ADR 0007's limit**, and one that creates rows still
   counts creations in its inserting function (ADR 0009, 0010), although neither expires a tag: the limits
   bound the writes themselves.

## Consequences

**Positive**

- No session-bound data can end up in a shared cache entry, and RLS stays the one rule for who reads
  what.
- No tag to name, scope, or forget to expire; a write can't leave a stale cached page behind.

**Negative**

- Every visit to a private page costs a database round trip, and a Supabase outage shows the page's
  unavailable state at once, with no cached copy to fall back on. Fine at the current scale: these pages
  have one reader each.
- `refresh()` re-renders the whole current route, not only the changed data.

## Alternatives Considered

- **`"use cache: private"`** — a per-request private cache that may read cookies. Rejected: it still
  needs tags or lifetimes to stay fresh after a write and saves nothing for data read once per visit by
  one reader.
- **A tagged cache keyed by author id through a service-role client** — rejected: it bypasses RLS, so a
  bug in the key would show one author's collections to another.
- **TanStack Query on the client** — rejected: these pages are server-rendered like the rest of the app
  (`docs/state-management.md`, user decision 2026-10-28), and the reads would need a route handler.
