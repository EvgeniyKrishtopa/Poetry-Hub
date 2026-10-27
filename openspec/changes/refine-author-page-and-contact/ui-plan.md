# UI Plan

Source: `docs/design-system.md` (recorded at commit `23ff8f1`; every component named below still
resolves to the path it gives) and the approved Claude Design canvas
https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z (2026-10-27). Values were read from the
canvas artboards by hand (Claude Design, not a Figma/Pencil server). No new component: every
screen reuses existing ones.

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| Contact dialog (footer «Связаться с нами») — thank-you view that closes itself after 3 s (FR-1) | form (unchanged); error: danger `Alert` «Не удалось отправить сообщение. Попробуйте ещё раз позже.» (unchanged, no auto-close); success: `Alert` tone `success` «Спасибо! Ваше сообщение отправлено.» + «Закрыть», focus on «Закрыть», closing by itself after 3 s, no countdown or progress bar; closed: focus back on the trigger | `Dialog`, `Alert`, `Button`, `TextField` (all unchanged; timing only) | Claude Design, artboard 10 (`Contact.dc.html`), state 2e |
| About editor (`/account/author`, about field) — «Редактор» tab without alignment (FR-2) | editing: one toolbar row with the seven `ghost` format buttons only, textarea, counter; error: over-limit counter in `danger` and the field error under the textarea (unchanged) | About-editor toolbar (`MarkdownToolbar`, `AboutViewTabs`, counter) without `AlignControl`; `FIELD_INPUT_CLASS` textarea | Claude Design, artboard 3 (`AuthorEditor.dc.html`) |
| About editor — «Просмотр» tab without alignment (FR-2, FR-3) | preview: the rendered about straight under the tabs, left-aligned; lists `list-style-position: inside`, `padding-left: 0` | `AboutViewTabs`, `AuthorAbout` | Claude Design, artboard 3 |
| Author page `/authors/<id>` — about left-aligned, poems section under it (FR-3, FR-5) | loading: the author page's existing skeleton (unchanged); error: `RootError`, trail «Автор»; not found: `NotFound`; with poems: h2 «Произведения» 24/32 px, weight 600, letter-spacing -0.01em, 16 px to the list; titles 18/28 px `foreground` links, 12 px apart, `accent` on hover, newest first; empty: the h2 + muted «У автора пока ещё нет публикаций.»; no about: the section right after the photo or placeholder; owner: «Редактировать профиль» above the name (unchanged); about lists: markers inside, no indent | `AuthorPhoto` / `AuthorPhotoPlaceholder`, `AuthorAbout`, `AuthorPoemList` (h1 → h2 at the section scale), `BreadcrumbsView` | Claude Design, artboard 12 (`AuthorPoemsEntry.dc.html`) |
| Former poem list `/authors/<id>/poems` (FR-6) | not found: `NotFound` «Страница не найдена», no trail | `NotFound` (unchanged) | Claude Design, artboard 13 (`PoemList.dc.html`) |
| Poem page `/authors/<id>/poems/<poemId>` — shorter trail (FR-7) | trail: Главная › Наши авторы › <author name> (link) › <poem title> (current, `accent`); loading, not found, error unchanged (error trail Главная › Наши авторы › Автор) | `BreadcrumbsView` (unchanged component, one item fewer) | Claude Design, artboard 14 (`Poem.dc.html`) |

## Acceptance-criteria cross-check

Every criterion with a visible outcome lands on a row: FR-1 (contact dialog), FR-2 (both editor
tabs), FR-3 (editor preview, author page), FR-5 (author page, with poems and empty), FR-6 (former
poem list), FR-7 (poem page), NFR-4 (author page headings). FR-4 and FR-8 change data, not
screens; FR-8's seeded authors are what the author page rows are checked on. No gap.
