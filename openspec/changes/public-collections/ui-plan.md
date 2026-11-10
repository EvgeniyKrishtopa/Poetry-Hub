# UI Plan

Component and state names come from `docs/design-system.md` (recorded at commit `23ff8f1`,
refreshed at `ba2f323`; every path it names still resolves at `31e8f7d`). States use that
document's names: `Loading`, `RootError`, empty (muted text), `NotFound`; the normal view has no
state name there and is listed as "loaded". Values come from the approved Claude Design canvas
(2026-11-10, https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83), read by hand:
`ui-plan` pulls node values only from Figma/Pencil, so the source column names the artboard (Claude
Design). The artboards use only existing tokens; no new primitive or offline state (these pages only
read).

New components (one per screen at most; everything else composes existing pieces):

- author page: `PublicCollectionsSection` — the «Сборники произведений» section; its markup and
  classes repeat `collection-management`'s `OwnCollectionItem` exactly (spec-clarify, 2026-11-10),
  because `collections` may not import `collection-management`.
- collection page: `PublicCollectionContent` (with its `PublicCollectionSkeleton`, built like
  `PoemPageSkeleton`) — heading, description paragraphs, and the poem list.

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/authors/<id>` — collections section | loaded (collections with nested poems); hidden (no visible collection, or poems unavailable); unavailable (h2 + muted «Сборники сейчас недоступны.», the empty-state look) | `PublicCollectionsSection` (new; `OwnCollectionItem`'s look: title `text-lg` link, nested `ul` `border-l border-border pl-4`, poem links `text-base`, accent hover, accent focus outline); h2 as `AuthorPoemsEntry`'s | Claude Design 38, states 1–3 and 5: section `gap 16px` under the h2, items 12 px apart, nested list `margin-top 8px`, `gap 8px`; sections 32 px apart (the page's existing gap) |
| `/authors/<id>` — «Произведения» section | loaded (free poems only); empty (muted «У автора пока ещё нет публикаций.»); hidden (every poem in a collection); unavailable (muted «Произведения сейчас недоступны.») | `AuthorPoemsEntry`, `PoemTitleList` (existing) | Claude Design 38, states 1–6 (existing look) |
| `/authors/<id>/collections/<collectionId>` | `Loading` (`PublicCollectionSkeleton`); loaded (h1, description paragraphs, h2 «Произведения», poem links); `NotFound`; `RootError` | `PublicCollectionContent` (new), `PoemTitleList` for the poem links (18 px, as on `CollectionPoemList`), `splitParagraphs` (shared lib) | Claude Design 39, states 1–3: h1 36/40 bold (30/36 under 640 px), description paragraphs 16 px / 1.7, 12 px apart, h2 24/32, links 18 px 12 px apart, sections 32 px apart; skeleton 40 px heading bar, two 20 px bars, three 24 px bars, `role="status"` «Загрузка…» |
| Breadcrumb trail of the collection page | loaded (four items); author-unavailable («Автор» current); collection-unavailable (author current); none (404) | `BreadcrumbsView` (existing) | Claude Design 39 (four items, author linked, title current in accent) |

Criteria coverage: FR-1 (collection hidden or shown → author page section, collection page
`NotFound`), FR-2 (section), FR-3 («Произведения» section), FR-4 (both sections' unavailable and
hidden states), FR-5 (collection page, every state), FR-6 (trail), FR-7 (same screens after a
reload; no new state), FR-8 (same screens for every visitor; no new state). NFR-6, NFR-7, NFR-8
apply to every row. No gap.
