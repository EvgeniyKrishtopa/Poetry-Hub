# 0009. A row-creating reader write counts the caller's own rows in the function that inserts

## Status

Accepted (2026-10-29); Amended by 0010 (counts creations, not live rows)

Partially supersedes: 0007 (its Decisions 1 and 3, and Decision 6's poem example)

## Context

ADR 0007 limits reader writes with a counter: the action calls `consume_write_allowance(scope)`
first, then writes. That fits profile edits, which update one row. `add-poem-creation` adds the first
reader write that creates rows, and its order is check, upload the illustration, then insert. With the
counter, the app would consume an attempt before the upload, and the insert function would have to
check it again. A caller using the database API directly could skip the consume step and insert as
often as they liked. ADR 0005 says the database must be where no client can bypass a rule.

The first version of the change held two short windows (2 per minute, 20 per day). On 2026-10-29 the
product owner replaced both with one window of 100 poems per 30 days and accepted that nothing slows
a burst down within those 100 (design D2 and Risks, "No burst throttle").

## Decision

1. **A reader write that creates rows is limited by counting the caller's own rows inside the
   `security definer` function that inserts them**, not by ADR 0007's counter table. (Amended by
   0010: once rows can be deleted, the function counts creations from a log, not the rows that
   still exist.) For poems:
   `create_my_poem` resolves the caller from `auth.uid()`, takes a per-author
   `pg_advisory_xact_lock`, asks `poem_create_status(profile)`, and inserts only on `allowed`, all in
   one transaction. The table has no insert grant, so this function is the only way in.
2. **The rules live in one internal function.** `poem_create_status` (execute revoked from every client
   role) holds the public-profile rule and the windows as a list of `(window_length, max_poems)` rows.
   Changing a number is a migration.
3. **One sliding window: 100 poems per 30 days**, counted over `created_at`, so there is no reset on
   the 1st of a month. It counts created poems, not attempts: a refused attempt writes nothing and
   expires no tag.
4. **No burst throttle within the 100** (product owner, 2026-10-29, accepted risk). ADR 0007's rate
   argument (a save loop keeping public pages uncached) therefore no longer applies to poems: one
   author can expire their own `poems:<authorId>` tag up to 100 times in a few seconds.
5. **The app asks first with a read-only twin.** `can_create_poem()` runs the same status check without
   the lock and the insert, before any upload, so a blocked attempt uploads nothing. It writes nothing,
   so calling it directly gains a caller nothing. The insert's own check stays the one that counts.
6. **The cap covers rows and tag expiries only.** Illustration uploads are not counted: the Storage API
   accepts any number of objects in the author's folder (the bucket checks size and type), and
   concurrent submits at 99 poems all pass the unlocked pre-check and upload before the locked check
   rejects all but one (their files are removed best-effort).
7. **ADR 0007 still holds for writes that update existing rows.** Profile writes keep
   `consume_write_allowance`, and its Decisions 2, 4, and 5 are unchanged. A later reader-owned feature
   that creates rows follows this record instead of adding a counter scope (ADR 0007's Decision 6).

## Consequences

**Positive**

- No client can skip the check: the only insert path counts rows in the same transaction.
- No new counter scope, and no counter row that can drift from the real number of poems.
- A sliding window has no boundary burst of twice the limit (ADR 0007's Decision 3 weakness).

**Negative**

- No short window: 100 creates and 100 tag expiries can happen in seconds, and a new account gets a
  fresh 100 at once. If abuse shows up, add a row to `poem_create_status`'s window list.
- Uploads stay uncapped (Decision 6); closing that needs a server-only upload path, as ADR 0007's
  consequences already note for author photos.
- Each create costs a count query; fine at the current scale, covered by the `(author_id, created_at)`
  index.

## Alternatives Considered

- **ADR 0007's counter with a `poem_create` scope** — rejected: the app would consume before the upload
  and the insert would check again, so a direct API caller could skip the consume step.
- **The counter consumed inside `create_my_poem`** — rejected: it counts attempts, not poems, needs a
  second scope for the pre-check, and adds a table row whose only job duplicates `count(*)` over the
  author's own poems.
- **Keeping the short windows (2 per minute, 20 per day) next to the 30-day one** — rejected by the
  product owner on 2026-10-29 as friction for real authors; recorded above as an accepted risk.
- **A calendar-month window** — rejected: it resets on the 1st, allowing 200 poems in a row across a
  month boundary.
