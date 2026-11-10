# Proposal

## Why

Since `add-poems-to-collections`, `/account/poems` shows each collection's poems nested under it in
the section «Сборники произведений», and then the plain poem list below repeats every poem again,
collected or not. A poem in a collection appears twice, and nothing tells the author which poems
still belong to no collection. The plain list should show only the free poems (user decision,
2026-11-10; `PROGRESS.md` Next steps item 2), so that every poem appears on the page exactly once
and a deleted collection's poems visibly move into the plain list.

## What Changes

- **`/account/poems` plain list shows free poems only.** The list below the section «Сборники
  произведений» lists only the author's poems that are in no collection, newest first, each its
  title as a link to `/account/poems/<poemId>`, exactly as today. No new heading, text, or element:
  just the list. With no free poems (no poems at all, or every poem in a collection), no list is
  rendered, as with no poems today.
- **Deleting a collection moves its poems into the plain list.** After a successful delete, the
  author lands on `/account/poems` and the deleted collection's poems are listed in the plain list.
  The same holds after a save on the collection poems page: a poem taken out of a collection
  appears in the plain list, and a poem added to one leaves it.
- **When membership can't be read, the plain list is not guessed.** If reading which poems are in
  a collection fails, the plain list is replaced by the existing alert «Не удалось загрузить
  произведения. Попробуйте позже.» (user decision, 2026-11-10: never show a list that may be wrong);
  the buttons stay, and the section shows its own existing alert.
- Public pages, the collection pages, and the collection poems page are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `poem-management`: the plain list on `/account/poems` lists free poems only, and a failed
  membership read shows the list alert (poem-management FR-2, FR-11).
- `collection-management`: after a delete, and after a collection poems save, the plain list on
  `/account/poems` shows the freed poems (collection-management FR-13, FR-15, add-poems-to-collections
  FR-12); the boundary rule names the read function the route passes to the poem list
  (collection-management NFR-3).

## UI copy

No new copy. Reused verbatim: «Не удалось загрузить произведения. Попробуйте позже.»
(poem-management FR-11).

## Mockups

None needed: no new screen, element, state, or text; the existing plain list shows fewer items.

## Requirements

Each requirement is specified with its scenarios in the delta specs. Summary:

| ID | Requirement | Spec |
| --- | --- | --- |
| FR-1 | The plain list on `/account/poems` lists free poems only; with none, no list (modifies poem-management FR-2) | poem-management |
| FR-2 | A failed membership read replaces the plain list with the list alert (modifies poem-management FR-2, FR-11) | poem-management |
| FR-3 | A deleted collection's poems appear in the plain list right after the delete (modifies collection-management FR-13, FR-15) | collection-management |
| FR-4 | After a collection poems save, the plain list shows the stored membership (modifies add-poems-to-collections FR-12) | collection-management |
| NFR-1 | Module boundaries: still no import between `poem-management` and `collection-management`; the route passes the membership read to the poem list (modifies collection-management NFR-3) | collection-management |
| NFR-2 | The section and the plain list use one membership read per request, so a poem is never shown in both, and with every read ok never in neither | collection-management |

## Impact

- **Code**: `src/features/collection-management/` (export a per-request memoized read of the
  author's collected poem ids, built on the existing `my_collected_poems` read; the section uses
  the same memoized read); `src/features/poem-management/` (`MyPoemsPage` / `MyPoemsContent` take
  that read as a prop and filter the own poem list); the route file
  `src/app/(authorized)/account/poems/page.tsx` passes it.
- **Database**: none. `my_collected_poems()` already returns what is needed; no migration, no
  deploy step.
- **Tests**: unit and component tests in both features; the boundary tests; a web-qa pass over
  `/account/poems` (delete a collection, save a collection's poems).
- **Docs**: `docs/state-management.md` if the per-request memoization rule needs a line for a
  private read (ADR 0008 covers public reads only).
