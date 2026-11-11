# UI Plan

Component and state names come from `docs/design-system.md` (recorded at commit `23ff8f1`, refreshed
through `ba2f323`; every path this plan names still resolves at `95c9c64`). States use that
document's names: `Loading`, `RootError`, empty (muted text), offline (`ConnectionNotice`); the normal
view has no state name there and is listed as "loaded". **The document has no name for any drag
state** (a lifted item, the drop place, a focused handle, a drop area): they are new, they use existing
tokens only (NFR-5), and the approved artboards define them (below); they are added to
`docs/design-system.md` after the change ships. The approved Claude Design canvas (2026-11-11, https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#play-2bdc46cfac98)
supplies the values; `ui-plan` pulls node values only from Figma/Pencil, so they were read by hand and the
source column names the artboard (Claude Design).

New components (at most one per screen; everything else composes existing pieces):

- `/account/poems` board: `WorkBoardIsland` — the client island with the lists, the handles, the drop
  areas, and the live region. Its list look repeats `OwnCollectionItem`'s markup and `PoemTitleList`'s
  link style (feature-local pieces that `work-ordering` may not import); the handle is a `Button` `ghost`
  look at 32×32 px, grey, with six dots (the artboards).

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/account/poems` — board, loaded | loaded (collections with nested poems, then the free poems, each item with a handle); loaded with nothing to move (one free poem and its handle, no collections section); empty (no poem and no collection: the page's existing state, no board) | `WorkBoardIsland` (new), `Button` (`ghost` look, handle) | Claude Design 40 · 1–2: handle 32×32, six grey dots, left of every collection and poem; titles stay links (18 px, nested 16 px with a left border and 16 px indent) |
| `/account/poems` — board, while dragging | lifted item (`surface` fill, `accent` border); drop place (dashed `accent` border the height of a row); collection under the cursor (`accent` border, `accent` 8% fill, dashed place first inside it); a lifted collection travels whole with its poems, its place among the collections dashed `accent`; drop area of an empty collection (dashed `--border`, muted «Перетащите сюда произведение.», `accent` border and `foreground` text under the cursor); free-poems drop area when none exists (dashed `--border`, the long text, `accent` border and `accent` 8% fill under the cursor) | `WorkBoardIsland` (new) | Claude Design 40 · 3–6 |
| `/account/poems` — board, keyboard and sending | focused handle (2 px `accent` outline, 2 px offset, as buttons); keyboard-lifted item looks as when dragged and keeps the focus outline, dashed place after the item it will follow; a move sending: every handle at 50%, list unchanged, board `aria-busy` | `WorkBoardIsland` | Claude Design 40 · 7–8 |
| `/account/poems` — board, after a refused move | danger `Alert` above the board, between the two buttons and the section, full width, with one of the three failure texts; handles active again | `Alert` (`tone="danger"`) | Claude Design 40 · 9 |
| `/account/poems` — board, connection | neutral notice above the board, offline or slow text, every handle disabled | `ConnectionNotice` (existing) | Claude Design 40 · 10 |
| `/account/poems` — board, loading | `Loading`: heading and buttons in place; in the board's place the section heading, a collection with two nested rows, a collection with none, two free rows, each with a handle placeholder; pulse off under reduced motion; screen-reader-only «Загрузка…» | the management pages' list skeleton look | Claude Design 40 · 11 |
| `/account/poems` — board, read failed | danger `Alert` in the board's place with the collections or the poems text; no section heading, no lists; the two buttons stay | `Alert` (`tone="danger"`) | Claude Design 40 · 12 |
| `/authors/<id>`, `/authors/<id>/collections/<collectionId>`, `/account/poems/collections/<collectionId>` | unchanged screens; only the order of items changes (FR-8, FR-9) | existing | none |

Criteria coverage: FR-1 (new items first → board loaded), FR-2 – FR-5 (board loaded and while
dragging), FR-6 (refused move, connection, loaded), FR-7 (focused handle, live region in
`WorkBoardIsland`; announcements are not visible), FR-8 and FR-9 (unchanged screens, loaded board),
FR-10 (no screen of its own; the collection poems page is unchanged), FR-11 (refused-move row, stale
text), NFR-4 (handle `button`s, `ul` nesting), NFR-5, NFR-6 (copy in the proposal's table) apply to
every row. FR-10's visible result (added poem first) lands on the loaded board. No gap.
