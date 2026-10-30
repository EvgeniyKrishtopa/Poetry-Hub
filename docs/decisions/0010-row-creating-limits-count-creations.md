# 0010. A row-creating limit counts creations, not live rows

## Status

Accepted (2026-10-29)

Amends: 0009 (its Decision 1 on what is counted, and Decision 2's counted source)

## Context

ADR 0009 limits poem creation by counting the author's own rows in `poems` with `created_at` inside
the window (100 per 30 days). That holds only while rows can't disappear. `delete-poem` adds a delete:
with it, a create → delete loop keeps the live count near zero, so the cap stops bounding creates,
illustration uploads, and `poems:<authorId>` tag expiries. The loop runs straight against the database
API, past any app check (Gate 1 C1). The product owner chose on 2026-10-29 to close this in the
database rather than accept it.

## Decision

1. **A row-creating limit counts creations, not the rows that still exist.** For poems, a creation log
   `public.poem_creations (author_id, created_at)` gets one row per stored poem from an
   `after insert on public.poems` trigger (`log_poem_creation`, `security definer`,
   `set search_path = ''`). A delete removes the `poems` row and nothing from the log, so a deleted poem
   keeps its place in the window until it ages out.
2. **`poem_create_status` counts `poem_creations`** instead of `poems` (same signature, same answers).
   `create_my_poem`, its advisory lock, and `can_create_poem` are unchanged; the trigger runs inside the
   create's transaction, so two concurrent creates still can't both pass as the last allowed one.
3. **The windows list has one home**, the internal `poem_create_limits()` (no client grant). The status
   check, the trigger's pruning, and the backfill read it instead of repeating `30 days`.
4. **The log stays bounded.** The trigger deletes the author's log rows older than the longest window,
   so it holds at most the cap per author.
5. **The log follows ADR 0007's counter-table pattern**: RLS on, no policies, every grant revoked from
   `anon` and `authenticated`; only definer functions and the trigger reach it. It holds no content,
   only an author id and a time.
6. **The migration backfills** the log from existing poems inside the window, so the switch doesn't
   hand every author a fresh 100.
7. **Deletes get no limit of their own.** An author can delete only poems they created, so deletes and
   their tag expiries are bounded by creates (the cap plus the poems they already had).

ADR 0009's other decisions stand: the check lives in the inserting function, one 100-per-30-days window,
no burst throttle, the read-only twin before the upload, uploads uncounted.

## Consequences

**Positive**

- Deleting can't reopen the cap, from the app or from a direct API call.
- Any later row-creating feature that also allows deletes has a pattern to follow.

**Negative**

- A deleted poem holds its place in the window for up to 30 days: an author who deletes a batch of test
  poems can't immediately create 100 new ones. Accepted (FR-9); the cap is generous for a real author.
- A second record of creation times next to `poems`, kept small by pruning.
- The seed's direct inserts pass the trigger too, so local test data counts toward the limit.

## Alternatives Considered

- **A separate delete limit through `consume_write_allowance('poem_delete')`** — rejected: it bounds tag
  expiries but leaves the create cap bypassable by the same loop, so the creation count would still be
  needed, and with it the delete limit adds nothing.
- **Soft delete (a `deleted_at` column, still counted)** — rejected: out of the change's scope, and every
  public read would need to filter it.
- **Counting creations in the inserting function itself, without a trigger** — rejected: a poem stored
  any other way (the seed, a future definer function) would skip the log.
