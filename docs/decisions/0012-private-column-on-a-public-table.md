# 0012. A private column on a public table: no grant, definer functions only

## Status

Superseded by 0013 (2026-11-10)

Amended ADR 0005 §1 and ADR 0011 §1 for this one case.

## Context

`add-poems-to-collections` stores which collection a poem belongs to on the poem itself
(`poems.collection_id`), as the request asked. Poems are public rows: an RLS policy lets `anon` and
`authenticated` read every poem of a public author, and an explicit column grant names the readable
columns (ADR 0005). Which collection a poem is in, though, is private to the poem's author, like the
collections themselves (ADR 0011).

Neither existing tool can express that. RLS decides per row, and the row is public. A column grant
decides per role, and the poem's author has the same role (`authenticated`) as every other signed-in
reader. So "only the row's owner sees this column" can't be said with a policy or a grant. Details:
`add-poems-to-collections` design D2 (Gate 1 C2 asked for this record).

## Decision

1. **The private column gets no grant at all.** The table's existing grant names its columns, so a new
   column is unreadable and unwritable by `anon` and `authenticated`. A `select *` from a client fails
   loudly instead of leaking it.
2. **The owner reads and writes it only through security definer functions** that take the owner from
   `auth.uid()` / `my_author_profile_id()`, never from an argument, and return or change only the
   caller's own rows (`my_collection_poem_choices`, `my_collected_poems`, `save_my_collection_poems`;
   migration `20261107140000_collection_poems.sql`). Execute is revoked from `public, anon` and granted to
   `authenticated`.
3. **The function's caller filter is the last line of defence.** This amends ADR 0005 §1 (column grants
   decide which columns a role reads) and ADR 0011 §1 (private reads run through the cookie client under
   RLS): here RLS can't help, because the rows are public. pgTAP must prove, for every such function, that
   another author's ids return nothing and change nothing, and that the column can't be selected or
   updated directly by any client role while the old public columns still select.
4. **Integrity the function relies on is also a database fact where possible.** A composite foreign key
   `(collection_id, author_id) → collections (id, author_id)` keeps a poem out of another author's
   collection even if a function were wrong.

## Consequences

**Positive**

- The poems table, its public policy, and every public read stay as they were; public pages can't show
  membership because the column is invisible to the roles they use.
- One place per operation holds the ownership rule, and pgTAP pins it.

**Negative**

- A bug in a definer function's filter is not caught by RLS: the tests carry more weight than for an
  RLS-protected table.
- The DAL reads this data through RPCs rather than table selects, a second read style next to ADR
  0011's.
- A future client query on `poems` must keep naming its columns.

## Alternatives Considered

- **A separate `collection_poems (poem_id primary key, collection_id)` table with owner-only RLS** —
  keeps the poems table untouched and lets RLS guard the rows. Rejected: the request asks for the id on
  the poem, and the composite foreign key plus no grant gives the same guarantees.
- **A column grant to `authenticated` plus a filter in the app** — rejected: every signed-in reader could
  then read every public poem's collection.
- **A security-barrier view over `poems` for the owner** — rejected: one more object with its own grants
  for what two small functions already do, and it still relies on a caller filter.
