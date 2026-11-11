# 0014. The author sets the order of their works; the database stores it as an integer position

## Status

Accepted (2026-11-11)

## Context

Until `drag-and-drop-ordering`, every list of an author's collections and poems read "newest created first",
computed from `created_at`. The author could not put a poem first, move a poem between collections without
the checklist page, or order their collections. The change adds a drag-and-drop board on `/account/poems`
(user decision, spec-clarify, 2026-11-11), so the order has to be stored, belong to the author, and be the same
on every page that lists the works, including the public ones.

The writes follow the rules already in force: no client role holds an insert, update, or delete grant, and
definer functions take the owner from `auth.uid()` (ADR 0005, 0012, 0013); per-account limits are scopes of
one counter (ADR 0007).

## Decision

1. **Order is an integer `position` on the row, per container.** `collections.position` (container: the
   author) and `poems.position` (container: the author's free poems when `collection_id` is null, otherwise
   that collection). Every list reads `order by position, id`; no page sorts again in the browser. Both
   columns are `not null`.
2. **Existing rows start where newest first put them** (a backfill with `row_number()` over the old order), so
   shipping the change moves nothing.
3. **A new row goes first, and the database decides that.** A `before insert` trigger on each table gives a
   row that names no position the first one of its container (`min(position) - 1`, negative values are never
   shown). So `create_my_poem`, `create_my_collection`, the seed, and any direct insert need no change, and
   the column can stay `not null`. A deleted item leaves a gap; gaps keep the order, so a delete renumbers
   nothing.
4. **Only definer functions write the order and the membership.** `move_my_poem` and `move_my_collection`
   renumber the lists they touch to `0..n-1` in one transaction, clamp the place into the list, and answer
   `moved` (with the author id, so the app expires the public cache tag), `stale` (the poem is not where the
   browser saw it), or `not-found` (another author's or unknown item, no profile, a non-public profile, all
   alike). `save_my_collection_poems` and `delete_my_collection` keep their signatures and place what they add
   or free first, in a defined order. `position` gets a select grant for `anon` and `authenticated` exactly
   where `collection_id` has one; nobody gets an update grant.
5. **One lock per author.** The two move functions, the two changed writers, and the insert triggers all take
   the per-author advisory lock the creates already take, so one author's writes queue and cannot deadlock;
   row locks inside are taken collections first (by id), then poems (by id).
6. **A move is limited to 30 per minute per account**, the `order_move` scope of `consume_write_allowance`
   (ADR 0007's shape, checked by the app after the session and before the move). The number lives in the
   migration and in the feature's constants module; the two are kept in step.
7. **The checklist stays newest first.** `my_collection_poem_choices` keeps `created_at desc` (user decision):
   it is a list to tick from, not the author's arrangement.

## Consequences

**Positive**

- One stored order serves the owner's pages and the public pages with the same read; no sort in the app, no
  second source of truth.
- Every writer, including future ones, gets "first in its list" for free from the trigger.
- A move is one transaction and a stale or foreign request writes nothing.

**Negative**

- A direct insert of several rows of one list gets the reverse of the insertion order. A test or a seed that
  asserts a list's order must give explicit positions (`collection_poems.test.sql` does).
- Every write of one author queues on one advisory lock. Fine at the sizes in the spec (at most 1000 poems per
  list, 30 moves a minute); revisit if an author's writes ever contend.
- `my_collected_poems` orders by position across collections, so the rows of different collections
  interleave; its readers group by collection and rely on the order within one.
- Gaps and negative positions exist until the first move of a list heals it. They are never shown.

## Alternatives Considered

- **A separate ordering table** — rejected: a join on every public read for no gain.
- **An array of poem ids on the collection** — rejected: a second source of truth beside
  `poems.collection_id`, and it breaks the one-membership guarantee.
- **Fractional or lexicographic ranks** — rejected: dense integers have no problem at the sizes in the spec,
  and are easier to read and test; the renumber on a move is one statement.
- **Setting the first position in each create function** — rejected: every writer, including a seed or a
  fixture, would have to remember it; the trigger makes the rule one place.
- **Row locks only, no advisory lock** — rejected: a poem joining the free list needs no row to lock, and two
  writers renumbering overlapping lists could deadlock; one lock per author is simpler to reason about.
- **Letting the client write `position` through a column grant** — rejected: the order is part of a
  membership change that must be atomic and owner-checked, which a grant cannot express (ADR 0005).
