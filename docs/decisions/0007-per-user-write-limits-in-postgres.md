# 0007. Per-user write limits for reader writes, held in Postgres

## Status

Accepted (2026-10-17)

## Context

ADR 0005 made every reader write a Server Action that, on success, expires the public pages'
cache tags with `updateTag`. Nothing limited how often a signed-in reader could do that. One account
running a save loop would keep `/authors` and the author pages uncached and send every visitor's read
to the database. Every photo upload also costs bandwidth, Storage, and a new image optimization.
`add-author-profiles` added the limit as FR-21 (design D13), on the user's decision of 2026-10-17.

## Decision

1. **Reader writes are limited per user, in the action, before any write.** The action checks the
   session, then counts one attempt with `consume_write_allowance(scope)`, then writes. Over the
   limit it returns a field failure and writes nothing, so it expires no cache tag. The photo action
   checks the limit before it reads the file's bytes.
2. **The limits live in a Postgres function, not in app code.** `consume_write_allowance(scope)` is
   security definer, takes only the scope, resolves the caller from `auth.uid()`, and holds the
   numbers (`profile_write` 10 per minute, `photo_upload` 5 per hour). Its counter table has RLS on,
   no policies, and no grants, so a client can neither raise a limit nor read or reset a counter.
   Changing a number is a migration.
3. **Fixed windows, one row per user and scope.** One atomic upsert counts the attempt and restarts a
   window that has passed, so concurrent attempts can't both pass as the last allowed one, and the
   table stays bounded. A burst across a window boundary can reach twice the limit; that still bounds
   the cache churn.
4. **A failed check fails closed.** The action writes nothing and shows the failure the existing
   classifier gives it (usually "unavailable").
5. **Per-IP flood protection is the hosting's job**, not the app's (Vercel Firewall or Cloudflare rate
   rules, a deploy-checklist step). These limits cover signed-in writes only.
6. **A later reader-owned feature adds its own scope** (for example, a poem write) to the function and
   the table's check, and calls the check the same way.

## Alternatives considered

- **Upstash Redis with `@upstash/ratelimit`.** Faster, and it keeps the counters off the database, but
  it adds a vendor, two secrets, a runtime dependency, and a stand-in for local runs and CI. Rejected
  while one short RPC per write, made only by signed-in readers, is cheap.
- **A sliding log, one row per attempt.** Exact over any 60 seconds, but the table grows with every
  attempt and needs a cleanup job. Rejected: the fixed window's worst case is acceptable.
- **Limits in TypeScript, passed to the function.** Rejected: a direct API call could pass any
  number. The database is the place no client input can change (ADR 0005, point 1).

## Consequences

- Each profile write costs one more database round trip.
- Without the migration, the actions refuse every write, so it ships before the app (`supabase db
  push` applies it) and is reverted after the app.
- Direct Storage uploads made with a reader's own token are still not counted: the bucket checks each
  file's size and type, not how many there are. Closing that needs a server-only upload path, which is
  a separate change.
