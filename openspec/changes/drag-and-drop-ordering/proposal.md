# Proposal

## Why

Every list of works is ordered by creation date, newest first, and the author cannot change it
(`add-poem-collections` listed "reordering the collections list" and `add-poems-to-collections`
"ordering poems in a collection" as out of scope). A poet builds a book: the poems of a cycle
have an order that is not the order they were written in, and the cycles themselves have one.
`public-collections` made collections public (user decision, 2026-11-10: "сначала публичные
сборники"), so readers already see the grouped works; this change lets the author decide in what
order they see them, and move a poem between collections by dragging it.

## What Changes

- **A stored order.** Each collection and each poem gets an author-set position. The author's
  collections have one order; the poems of each collection have one order each; the free poems
  (a poem in no collection, `CONTEXT.md`) have one order. Every collection and poem that exists
  today starts in its current order (newest first), so nothing moves when this ships. A newly
  created poem or collection goes first in its list, as it does today.
- **Drag and drop on `/account/poems`** (user decision, 2026-11-11), in the author's own list of
  collections and free poems:
  - reorder the poems inside a collection;
  - move a poem from one collection to another, at the place where it is dropped;
  - move a free poem into a collection, and a poem out of a collection into the free poems, at
    the place where it is dropped;
  - reorder the free poems among themselves;
  - reorder the collections relative to each other.
- **Saved at once** (user decision, 2026-11-11): every drop is stored when it ends. There is no
  «Сохранить» button and no unsaved-changes dialog. A drop the server refuses puts the item back
  where it was and shows an alert.
- **Keyboard and touch.** Every move above can be made with the keyboard alone and by touch, and
  is announced to screen readers.
- **The order is public.** The author page `/authors/<id>` (the collections section, each
  collection's poems, the free poems «Произведения»), the public collection page, and the
  author's own `/account/poems` and collection page all show the author's order instead of
  "newest first". Same content for every visitor.
- **Changes made elsewhere keep the order sensible.** Choosing a collection's poems on
  «Произведения сборника» puts the poems added to the collection first in it, and a poem taken
  out first among the free poems. Deleting a poem or a collection leaves the others in order.
- **Freshness.** After a move, the next request for the author's public pages shows it, with no
  wait for a cache lifetime (the existing per-author tag, `public-collections` NFR-2).
- **Limits.** Moves have their own write limit, counted per signed-in account (NFR-2).
- **New dependency** for dragging (design D5): a drag-and-drop library with keyboard and touch
  support. The project's install commands are denied to agents, so the user installs it.
- Out of scope: ordering by anything but the author's drag (no sort menu, no "sort by title");
  moving several poems at once; undo; a button-only alternative to dragging; dragging a collection
  into another collection (they do not nest); dragging on any public page; reordering on
  `/account/poems/collections/<id>/poems` (the checkbox page keeps its newest-first checklist);
  detecting two tabs reordering at once (the last drop wins); offline queueing.

## Capabilities

### New Capabilities

- `work-ordering`: the author's order of collections, of the poems in each collection, and of the
  free poems; moving a poem between collections and the free list; the drag-and-drop surface on
  `/account/poems`, its saving, failure, keyboard, and touch behaviour; the limit and the
  database rule for moves.

### Modified Capabilities

- `public-collections`: the collections section and the collection page list in the author's order
  instead of newest first (FR-2, FR-5).
- `author-poems`: the «Произведения» section lists the free poems in the author's order (FR-1);
  the poems read carries each poem's position.
- `collection-management`: the collection page `/account/poems/collections/<id>` lists poems in the
  author's order; choosing a collection's poems places the added and the freed poems (add-poems-to-collections FR-4).
- `poem-management`: the free poems list on `/account/poems` is the author's order; a new poem
  goes first among the free poems.

## UI copy

| Key | Text |
| --- | --- |
| Drag handle of a collection | `Переместить сборник «<title>»` (the handle's accessible name) |
| Drag handle of a poem | `Переместить произведение «<title>»` |
| Empty collection's drop area | `Перетащите сюда произведение.` |
| Empty free poems drop area | `Перетащите сюда произведение, чтобы оно не входило ни в один сборник.` |
| Keyboard instructions (read once when a handle is focused) | `Нажмите пробел, чтобы взять. Стрелками выберите место. Пробел — положить, Escape — отменить.` |
| Screen reader announcements | `Взято: «<title>».` · `«<title>» — позиция <n> из <total>.` (a move or a drop inside the same list, and every collection move, <n> among the collections) · `«<title>» помещено в сборник «<collection>», позиция <n> из <total>.` and `«<title>» помещено в свободные, позиция <n> из <total>.` (only when a poem's list changes) · `«<title>» возвращено на прежнее место.` |
| Failure | `Не удалось сохранить порядок. Попробуйте ещё раз.` |
| Over the limit | `Слишком много перестановок за минуту. Подождите немного и повторите.` |
| The list changed elsewhere | `Список изменился в другой вкладке. Мы обновили его — попробуйте ещё раз.` |
| Not signed in | the existing session-expired text of `/login` |
| Profile no longer public | the «The list changed elsewhere» text above, then the refreshed page shows its existing not-public notice |

## Mockups

Approved Claude Design canvas (2026-11-11): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#play-2bdc46cfac98,
artboard 40 in five files, 12 states, each in light and dark at 1280 px and 375 px. Every text matches the
UI copy table above and the artboards use only existing tokens and primitives; the drag states are new
looks built from those tokens (ui-plan.md).

| Screen | Artboard |
| --- | --- |
| Board 1–3: loaded; nothing to move; a poem lifted inside a list and over another collection | 40 · `/account/poems` — доска (`PoemsBoard.dc.html`) |
| Board 4–6: a collection lifted; an empty collection and the free-poems area as drop areas | 40 · доска — перенос (`PoemsBoardDrag.dc.html`) |
| Board 7–8: keyboard focus and keyboard lift; a move sending | 40 · доска — клавиатура, отправка (`PoemsBoardKeys.dc.html`) |
| Board 9–10: the three failure alerts; offline and slow connection | 40 · доска — сбои, связь (`PoemsBoardErrors.dc.html`) |
| Board 11–12: loading; either read failed | 40 · доска — загрузка, чтение (`PoemsBoardLoad.dc.html`) |

## Requirements

Each requirement is specified with its scenarios in the delta specs. Summary:

| ID | Requirement | Spec |
| --- | --- | --- |
| FR-1 | The author's order of collections, of each collection's poems, and of the free poems is stored; existing items keep today's order; new ones go first | work-ordering |
| FR-2 | Reorder poems inside a collection by drag | work-ordering |
| FR-3 | Move a poem from one collection to another, at the dropped place | work-ordering |
| FR-4 | Move a poem between the free poems and a collection; reorder the free poems | work-ordering |
| FR-5 | Reorder collections relative to each other | work-ordering |
| FR-6 | Every drop is saved at once; a refused drop puts the item back and shows an alert | work-ordering |
| FR-7 | Keyboard, touch, and screen reader operation of every move | work-ordering |
| FR-8 | Public pages show the author's order, the same for every visitor, fresh after a move (modifies public-collections FR-2, FR-5, author-poems FR-1) | work-ordering, public-collections, author-poems |
| FR-9 | The author's own pages show the same order (modifies collection-management, poem-management) | collection-management, poem-management |
| FR-10 | Choosing a collection's poems, creating, and deleting keep the order sensible (modifies add-poems-to-collections FR-4) | collection-management, poem-management |
| FR-11 | A move refused because the list changed elsewhere refreshes the list and says so | work-ordering |
| NFR-1 | Database: positions are readable by every role that reads the row, written only by the new definer functions, atomically; no client role gains an update grant | work-ordering |
| NFR-2 | At most 30 moves per minute per account, counted after the session check and before the move | work-ordering |
| NFR-3 | Module boundaries: a new `work-ordering` feature; `poem-management` and `collection-management` still import neither each other nor it | work-ordering |
| NFR-4 | Accessible drag handles, instructions, announcements, focus kept on the moved item | work-ordering |
| NFR-5 | Design tokens and shared primitives only | work-ordering |
| NFR-6 | Russian UI copy verbatim | work-ordering |
| NFR-7 | Logs carry no titles or ids | work-ordering |
| NFR-8 | The build needs no env; the dragging code loads only on `/account/poems` | work-ordering |

## Open Questions

None open. Three defaults were taken in the draft and shown to the user at the end of spec-clarify
(2026-11-11); they stand unless the user changes them:

1. A poem added to a collection on «Произведения сборника» goes first in it (several: checklist order).
2. The limit of 30 moves per minute.
3. A collection page of the owner (`/account/poems/collections/<id>`) is read-only: no dragging
   there, only on `/account/poems`.

## Impact

- **Database**: a new migration — `collections.position` and `poems.position` (backfilled from
  today's newest-first order per container), two `before insert` triggers that give every new row the
  first position, select grants on the new columns for `anon` and `authenticated`, two definer
  functions `move_my_poem` and `move_my_collection`, a new write-limit scope `order_move`, and changes
  to `save_my_collection_poems` (added poems first, removed poems first among the free ones),
  `delete_my_collection` (the freed poems go first among the free ones) and `my_collected_poems`
  (orders by position); the per-author advisory lock in the four writers. `create_my_poem`,
  `create_my_collection`, and `my_collection_poem_choices` are unchanged. pgTAP updated and extended.
- **Code**: new feature `src/features/work-ordering/` (the board on `/account/poems`, the move
  actions, their DAL); `src/features/poems/`, `collections/`, `collection-management/`,
  `poem-management/` (reads order by position; the four copies of the "free poem" and "newest first"
  rules named in `docs/deferred.md` change in step); `src/app/(authorized)/account/poems/page.tsx`
  (composes the board in place of the two lists).
- **Dependencies**: one drag-and-drop library (design D5), exact-pinned.
- **Docs**: ADR for the order model and who writes it; `CONTEXT.md` (Collection and Free poem keep
  their meaning, "newest first" is not part of either); `docs/environment.md` deploy checklist (the new
  migration); `docs/deferred.md` (close the public-collections 7.2 "four copies" entry; the "owner's pages read uncached" entry stays open and gains the board's read).
