# UI Plan: add-breadcrumbs

State names, tokens, and existing components come from `docs/design-system.md`. Values come from the approved Claude Design canvas (proposal `## Mockups`), artboard «7 · Навигационная цепочка» (`project/Breadcrumbs.dc.html`); no Figma/Pencil server, so the values were taken from the artifact by hand.

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| Trail row under the header, on every non-home page (`/authors`, `/authors/<id>`, `/account`, `/account/author`, `/login`, `/signup`) | loading: `aria-hidden` row, 16 px top padding + one empty 20 px line (`pt-4` + `h-5`), no skeleton pulse. Shown: container `mx-auto max-w-4xl px-6 pt-4`, 14/20 px (`text-sm`); list wraps with 8 px between items, 4 px between lines; parent links `text-foreground`, no underline, `text-accent` on hover (150 ms color transition); current item `text-accent`, `font-medium`, `aria-current="page"`, breaks anywhere when long; separator «›» `text-muted`, `aria-hidden`, inside the item it precedes. Light and dark themes through the tokens | **new** `BreadcrumbsView` (no breadcrumb primitive exists; `BreadcrumbsPlaceholder` is its loading state); links follow `AuthorsNavLink`'s hover pattern | Claude Design: Breadcrumbs.dc.html, «/authors · загрузка», «/authors · два пункта», «/account/author · три пункта · наведение» |
| Trail on `/authors/<id>` | shown with the author's name; long name wraps at 360 px; shown with «Автор» when the author read is unavailable (same look, no error styling); none when the author is not found (the page is a `NotFound`) | `BreadcrumbsView` | Claude Design: «/authors/<id> · три пункта», «· длинное имя», «· автор недоступен» |
| Home `/` | empty: no trail and no reserved row; page content starts right under the header | none | Claude Design: «нет цепочки · главная» |
| Unknown URL | `NotFound` route state with no trail (the placeholder row collapses once the trail resolves to nothing) | `NotFound` (existing, `src/app/not-found.tsx`) | Claude Design: «нет цепочки · неизвестный URL или неизвестный автор → 404» |

## Criteria cross-check

Every acceptance criterion with a human-visible outcome lands on a row:

- FR-1 (home no trail, other pages show it) → rows 1, 3
- FR-2 (items per route) → row 1
- FR-3 (links, current-item accent) → row 1
- FR-4 (author name, «Автор», none on not-found) → row 2
- FR-5 (same for every visitor) → row 1 (the mockup shows the same trail with «Войти» and with «Выйти» in the header)
- FR-6 (unknown URL no trail) → row 4
- FR-7 (follows client-side navigation) → rows 1, 3
- NFR-3, NFR-4 → row 1

No gaps. NFR-1, NFR-2, NFR-5, NFR-6 have no visible outcome of their own beyond row 1.

Mockup-only details not taken into this change: the header's bottom border and the pages' 32 px top padding in the mockup frames belong to other artboards and to the existing pages, not to the trail.

Note: `docs/design-system.md` records commit `23ff8f1`; it was last edited at `507d1dd`. Every name used here resolves to its recorded path.
