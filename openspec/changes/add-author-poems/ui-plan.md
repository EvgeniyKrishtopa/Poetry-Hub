# UI Plan

States and component names come from `docs/design-system.md`. Values come from the approved
Claude Design canvas (proposal `## Mockups`, artboards 11–15), read by hand: `ui-plan` pulls
nodes only from Figma/Pencil, so the source column says "Claude Design" with the artboard.
Shared values on every screen: content column 896 px (`max-w-4xl`), page padding 64/24 px
(`py-16 px-6`), 32 px between blocks (`gap-8`), H1 36/40 bold, tracking -0.025em (30/36 below
640 px), trail row 14/20 with 16 px top padding.

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| Error screen (any route, `app/error.tsx`) | error (`RootError`: heading, muted text, digest); retrying (new: «Повторить» disabled at the `Button`'s existing 50% opacity, label unchanged, while the page and trail refresh); recovered (the page and its trail replace the screen together) | existing `RootError`, `Button` (its `disabled` style); no new component | Claude Design, artboard 15: H1 + muted text + primary «Повторить», 16 px gaps (`gap-4`); retrying = `disabled` (opacity .5, same label) and `aria-busy="true"` on `main`; trail «Главная › Наши авторы › Автор» above it on author/poem pages |
| Author directory `/authors` and author page `/authors/<id>` (existing screens, new failure rules) | loading (existing skeletons); default; error with no cached data (directory: existing danger `Alert` «Список авторов сейчас недоступен.»; author page: `RootError`, trail «Автор»); stale data kept on a failed refresh (looks exactly like default) | existing `AuthorDirectory`, `AuthorList`, `Alert`, `AuthorPage`, `BreadcrumbsView`; no new component | Claude Design, artboard 15: directory error = H1 «Наши авторы» + danger `Alert` (surface, 4 px danger left border, 6 px radius, `px-3 py-2`, 14/20 medium) |
| Home `/` | default (CMS greeting in the banner); fallback (static site name and description in the same banner) | `HomeGreeting` restyled as the banner (`section`, `bg-surface`, `border-border`, `rounded-2xl`); no new component | Claude Design, artboard 11: banner `bg-surface`, 1 px `border-border`, 16 px radius (`rounded-2xl`), padding 32 px (24 below 640), 16 px gap; paragraphs 18 px / 1.625 (16 below 640), max 65ch, `whitespace-pre-line`; no CTA |
| Author page `/authors/<id>`: poems entry | default with poems (link «Произведения автора»); empty (muted «У автора пока ещё нет публикаций.»); loading (inside `AuthorPage`'s existing skeleton); not found (`NotFound`); error (`RootError`) | existing `AuthorProfileView`, `AuthorPhoto`; new `AuthorPoemsEntry`: the slot content, a link or the empty text | Claude Design, artboard 12: entry is the last block of the profile (after about, or after the photo), 32 px above it; link 18/28, weight 500, `text-accent`, underline on hover; empty text `text-muted` 16/24 |
| Poem list `/authors/<id>/poems` | default (h1 «Произведения» + list of title links); empty (h1 + muted empty text, the project's empty pattern); loading (skeleton blocks, `bg-surface animate-pulse`, as `Loading`); not found (`NotFound`); error (`RootError`) | `BreadcrumbsView` (trail, via the slot); new `AuthorPoemList`: the list view with its empty branch | Claude Design, artboard 13: list gap 12 px, items 18/28, `text-foreground`, `hover:text-accent` (150 ms); empty = H1 + muted text; skeleton = 240×40 heading block, three 24 px lines (168/208/144 px), 16 px gap, empty trail row holding its 20 px height, sr-only «Загрузка…» |
| Poem page `/authors/<id>/poems/<poemId>` | default (illustration, h1, text, footer with date and genre); loading (skeleton: illustration block at 16:9, heading, three lines); not found (`NotFound`); error (`RootError`) | `BreadcrumbsView` (trail); new `PoemView`: illustration via `next/image`, plain-text paragraphs, footer | Claude Design, artboard 14: illustration 16:9 full column width, 16 px radius; 32 px between illustration, H1, text, footer; stanzas 24 px apart, italic 18 px / 1.7 (16 below 640), `whitespace-pre-line`; footer 14/20 `text-muted`, gap 4×16 px; skeleton = 16:9 block, 280×40 heading, three 16 px lines (62/56/48 %), 14 px gap |

## Acceptance-criteria cross-check

Every criterion with a visible outcome lands on a row:

- FR-1 (entry, both branches, same for every visitor) → Author page.
- FR-2, FR-3 (list, order, empty) → Poem list.
- FR-4 (illustration, heading, paragraphs, date, genre, literal markup) → Poem page.
- FR-5 (404, error screen) → Poem list and Poem page, states `NotFound` / `RootError`.
- FR-6 (same for every visitor) → all three poem screens (no session-dependent state).
- FR-8 (trails) → Poem list and Poem page, `BreadcrumbsView`.
- FR-9 (banner, no search or list) → Home.
- NFR-6 (one h1, list of links, alt, `<time>`) → Poem list and Poem page.
- NFR-7 (copy) → every row.
- FR-11 (retry lock, page and trail refresh together) → Error screen.
- FR-12 (page and trail agree) → Error screen, author directory/author page, Poem list, Poem page.
- FR-13 (last navigation wins) → author directory/author page, Poem list, Poem page (no state of its own: the screen simply ends on the second target).
- FR-14, FR-15 (cold failure, stale kept) → author directory/author page (error state; stale state identical to default).

FR-7, FR-10, NFR-1..NFR-5 have no visible outcome of their own (data rule, removed code, code
structure, build, tokens). No gaps.

Note: `docs/design-system.md` records commit `23ff8f1`, 256 commits behind `HEAD`. Every name used
above still resolves to its documented path, so the plan stands; task 6.1 refreshes the
document (`PoemCard` goes, the new views come in).
