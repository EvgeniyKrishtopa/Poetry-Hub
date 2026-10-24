# 0008. A public read shared by a page and its trail is memoized per request

## Status

Accepted (2026-10-24)

## Context

The author page, the poem list and poem pages (`add-author-poems`), and their breadcrumb trail
(the `@breadcrumbs` slot, `features/breadcrumbs`) each read the same author in one request: the
page through `getPublicAuthor`, the trail through `getPublicAuthorName`, which calls it. Each call
was its own `"use cache"` lookup. An entry can expire or be replaced between two lookups (a failed
read lives for seconds only, ADR 0005 Decision 3), so one call could fail while the other
succeeded: the trail could show the author's name above the error screen, or «Автор» above a
loaded page. The user asked that page and trail always agree (2026-10-24). Details:
`add-author-poems` design D12.

The same change first tried to stop caching failed reads altogether (throwing inside the cache
scope). A probe on a local production build showed that approach fails an env-less build, logs
each failure twice, and does not keep the last good data when a refresh fails, so ADR 0005's
`seconds` lifetime stays (design D14).

## Decision

1. A public read that a page and its breadcrumb trail both call is wrapped in React's `cache`
   (`export const getPublicAuthor = cache(async (id) => …)`), around the id check and the
   `"use cache"` call. Every caller in one request gets the same promise and result; derived
   reads (`getPublicAuthorName`) call it rather than the cached function.
2. The next public read of this kind follows the same rule: the poems DAL's `getAuthorPoem` gets
   the wrapper when it is created, and so will a database read that replaces it.
3. ADR 0005 stays in force, Decision 3's lifetimes included. `docs/state-management.md`,
   "Supabase public reads", states the rule.

## Consequences

**Positive**

- Page and trail can never disagree about an entity within one request; a failed read fails both
  together, and the next request reads again.
- At most one cache lookup per entity per request.

**Negative**

- `React.cache` memoizes only in the server React build; Vitest runs the client build, so tests
  mock `react`'s `cache` with a per-test memo.
- A read memoized this way must be called with the same arguments by every caller (a different
  spelling of the id is a separate entry).

## Alternatives Considered

- Two independent reads, relying on `"use cache"` deduplication — rejected because dedup joins
  only calls in flight at the same moment in one process; a lookup just after an entry expires or
  changes can still see a different outcome.
- Passing the page's result down to the trail as a prop — rejected because the trail renders in
  a separate parallel-route slot, not under the page, so there is no parent to pass it through.
- Not caching failures at all, so both calls simply retry — rejected after the probe (design
  D14): an env-less build fails and a failed refresh still drops the last good data.
