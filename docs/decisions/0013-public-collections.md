# 0013. Collections and membership are public data; only managing them is private

## Status

Accepted (2026-11-10)

Supersedes 0012.

Amends 0011 (Decision 1, Decision 4, Decision 5, for collections: see Decision 5 below).

## Context

`add-poem-collections` made collections private: an owner-only RLS policy, no `anon` grant (ADR 0011).
`add-poems-to-collections` stored membership on the poem as `poems.collection_id` and gave the column no
grant at all, so only the owner's definer functions could read it (ADR 0012).

`public-collections` reverses that product decision (user decision, 2026-11-10): an author's collections,
their descriptions, their poems, and which collection a poem is in are public. Guests see them on the
author page and on a collection page. Only managing collections (create, edit, delete, choose poems)
stays private to the author. Details: `public-collections` design D2.

## Decision

1. **A collection is readable by `anon` and `authenticated` when its author's profile is public and at
   least one poem is in it.** One more select policy on `collections`, next to the owner policy (Postgres
   ORs them, so an author still reads their own empty collections and their collections while their
   profile isn't public). `anon` gets the same column grant `authenticated` already had. An empty
   collection stays hidden: a guest never sees a shelf with nothing on it.
2. **`poems.collection_id` gets a select grant for `anon` and `authenticated`.** The rows stay public
   authors' only (the existing poems policy), so a non-public author's membership stays unreadable.
   No role gains an update grant: membership changes only through `save_my_collection_poems`.
3. **Writes are unchanged.** No client role has an insert, update, or delete grant on either table; the
   write functions still take the owner from `auth.uid()` and `my_author_profile_id()`.
4. **`delete_my_collection` also returns the deleted row's `author_id`**, as `delete_my_poem` does, so the
   app expires the author's public cache tag whatever the profile's status.
5. **What changes and what stays of the older records.** ADR 0012's definer functions
   (`my_collection_poem_choices`, `my_collected_poems`, `save_my_collection_poems`) stay as the owner's
   convenience and the only write path. The owner's pages keep reading collections uncached under the
   cookie client (ADR 0011 Decision 2 and 3 still describe that read), now with an explicit author filter
   in every owner read, because RLS no longer limits that client to its own rows. Amended against ADR
   0011: Decision 1 (collections are no longer private reader data for the public side, which reads them
   cached under one per-author tag, `public-collections` design D4), Decision 4 (a collection write now
   also expires that tag, besides `refresh()`), and Decision 5 (the write limits stay, and the deletes
   that expire the tag are the ones the limits don't cover, as before).

## Consequences

**Positive**

- Public pages read membership straight from the poem row and the collection rows, with the same cached
  public client every other public read uses.
- No new table, view, or function for the public side.

**Negative**

- Anything an author wrote in a collection description becomes public once the collection holds a poem.
  Collections exist only in development so far, so no real author is affected.
- The cookie client can now read another public author's non-empty collections, so the owner's DAL must
  keep filtering by the own author id (pinned by `own-collections.test.ts`).
- ADR 0012's "no grant" protection is gone for this column; pgTAP pins the new rule instead (public
  authors' rows only, no write for any role).

## Alternatives Considered

- **Keep collections private and show only poems** — rejected by the user: the collection is the unit an
  author wants to show.
- **A public view or definer function for the public read** — rejected: one more object with its own
  grants for what a policy and two column grants already say.
- **Show empty collections to guests** — rejected: an empty collection has nothing to read.
