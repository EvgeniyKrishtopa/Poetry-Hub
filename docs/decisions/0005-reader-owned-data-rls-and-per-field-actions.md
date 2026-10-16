# 0005. Reader-owned data: RLS as the last line of defense, per-field actions, cached public reads

## Status

Accepted (2026-10-16)

## Context

`add-author-profiles` stored the first data a reader owns and edits: an author profile (names, a
Markdown about, a photo) in Supabase Postgres and Storage, edited on `/account/author` and shown
publicly on `/authors` and `/authors/<id>` once both names are set. Until then the app only read
editorial content (Contentful) and the session (ADR 0003, ADR 0004).

The next reader-owned features (poems, collections) will face the same questions: who enforces
ownership, how a write reaches the server and the cache, how public pages read the data without
per-request work, and how a file gets uploaded. `docs/state-management.md` also had two rules this
change had to depart from (a feature DAL opening its own cache scope; invalidation from a Server
Action rather than a route handler). Details live in the archived change's `design.md`, D2–D5.

## Decision

1. **The database is the last line of defense for reader-owned rows.** RLS on the table and on
   `storage.objects`, plus column grants: no client role selects or writes `user_id`, there is no
   insert grant, and updates are limited to the content columns. The owner reaches their own row
   only through security definer functions that resolve the caller from `auth.uid()` and take no
   user id (`ensure_my_author_profile()`, `my_author_profile_id()`, `owns_author_profile(folder)`).
   Storage paths use the profile id, never the auth id. App code addresses rows by id and never
   sends `user_id`.
2. **One Server Action per field write, user from the session.** Each action has a tight Zod schema,
   resolves the user with `getCurrentUserId()` (never from input), writes through the cookie client
   so RLS applies, and on success calls `updateTag` for the directory and the author's page tags,
   so the action's own re-render already carries the fresh data. Failures are returned as values
   and shown under the field; the client keeps no copy of server data (props are the source of
   truth after a save).
3. **Public reads are cookie-less and cached in the feature DAL.** `createSupabasePublicClient()`
   (anon role, no cookies) is used inside a `"use cache"` scope opened by the feature's DAL, with
   per-entity tags and a `cacheLife` chosen by the result: `hours` for ok, `minutes` for not-found,
   `seconds` for unavailable. Anon RLS returns only public rows.
4. **Files upload through a Server Action, checked in the browser first.** The browser checks size
   and type by magic bytes before sending; the action repeats the same check; the bucket's limits
   are a third check. `serverActions.bodySizeLimit` is set just above the file limit, and a
   rejected action call maps to a generic field error, never the error screen.

## Consequences

**Positive**

- A bug in app code cannot leak or overwrite another reader's row: RLS and grants still refuse it,
  and pgTAP tests (`supabase/tests/`) pin that.
- Public pages prerender and stay fast; a Supabase outage heals within seconds instead of freezing.
- A reader sees their own edit on the next render, everywhere, with no client cache to sync.
- The pattern is documented (`docs/state-management.md`, "Supabase public reads") for poems and
  collections to copy.

**Negative**

- Every new reader-owned table needs its own policies, grants, and definer functions, plus pgTAP
  tests run locally (not in CI).
- Four actions instead of one generic endpoint: more files per feature.
- Uploads go through the Next server and count against the action body limit; files much larger
  than 5 MiB would need a different path.
- A failed old-photo removal after a successful replace leaves an orphaned object (logged, not
  cleaned up).

## Alternatives Considered

- App-level ownership checks with a service-role client — rejected because one missed check exposes
  every row; RLS holds even when app code is wrong, and no service-role secret ships to the server.
- Letting authenticated users `select (user_id)` so the DAL filters by it — rejected because any
  signed-in user could then read every public author's auth id.
- A single generic `saveField({ field, value })` action — rejected because a union schema attaches
  errors to one field less precisely than four tight schemas.
- `revalidateTag` instead of `updateTag` — rejected because it serves stale data on the re-render
  that follows the save.
- A shared client-owned cache scope (the previous rule) — rejected because the scope must wrap the
  row mapping and the result-dependent `cacheLife`.
- A signed upload URL with a direct browser upload to Storage — rejected because it needs a browser
  Supabase client (removed by ADR 0004) and a second round trip.
- A Zustand store for the editor's cross-field state — rejected because the state belongs to one
  component subtree; a module-level store adds global state for no gain.
