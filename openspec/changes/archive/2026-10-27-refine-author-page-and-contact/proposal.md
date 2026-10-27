# Proposal

## Why

Three small refinements to features that already shipped (user request, 2026-10-27):

- After a visitor sends the contact form, the thank-you view stays open until they close it by
  hand. A short confirmation that closes on its own is enough.
- The author's about editor offers left, centre, and right alignment. Centred and right-aligned
  prose and lists read poorly and complicate the editor, the public page, and the database for
  no real use. About text is always left-aligned.
- An author's poems sit one click away on a separate page that holds nothing but a list of
  titles. Putting the list straight on the author page removes a step and a page.

## What Changes

- **Contact dialog**: once the thank-you view is visible in the open dialog, the whole dialog
  closes by itself after 3 seconds. The «Закрыть» button stays and still closes it at once.
- **About editor**: the alignment control («По левому краю», «По центру», «По правому краю»)
  is removed. About is always left-aligned in the editor preview and on the public author page.
- **BREAKING (schema)**: the `about_align` column is dropped from `public.author_profiles`
  with a new migration (user decision, 2026-10-27). The save action, its schema, the DAL, and
  the profile types lose the alignment field.
- **Test data**: every existing author record is test data (user decision, 2026-10-27). A new
  `supabase/seed.sql` creates a fixed set of test readers and author profiles; resetting the
  local database (`npx supabase db reset`) deletes all old records and loads the new ones.
- **Author page**: the poems entry (the «Произведения автора» link) is replaced by the poem
  list itself, under the description (after the photo when there is no description): the
  heading «Произведения», then the poem titles as links, newest first, or the text «У автора
  пока ещё нет публикаций.». It looks the same as the current separate page, with the heading
  one level lower because the author's name is the page's level-1 heading.
- **BREAKING (route)**: the page `/authors/<id>/poems` is removed. Its URL returns 404 with
  no redirect (user decision, 2026-10-27). The poem page keeps its URL,
  `/authors/<id>/poems/<poemId>`.
- **Breadcrumbs**: the poem page's trail drops the «Произведения» item and reads Главная ›
  Наши авторы › <author name> › <poem title> (user decision, 2026-10-27). The trail table loses
  the poem list route.
- **Design sync**: after Gate 2 and the test plan, a Claude Design brief covering the changed
  screens is written so the design canvas matches the project (`docs/claude-design.md`).

### Requirements

- **FR-1** — Contact dialog closes itself after success, and only then. When the thank-you view is shown in
  the open dialog, the dialog SHALL close 3 seconds later, exactly as if «Закрыть» had been
  activated (focus returns to the button that opened it, and the next open shows an empty
  form). Closing it earlier, with «Закрыть», Escape, or the dialog's close button, cancels the
  timer; any other activity in the dialog (pointer, focus, keys) neither pauses nor restarts it. Only the thank-you view «Спасибо! Ваше сообщение отправлено.» triggers it; the form, its
  errors, the sending state, and the failure alert never close the dialog by themselves. If the
  success arrives while the dialog is closed, the 3 seconds start when the
  dialog is next opened and shows the thank-you view.
- **FR-2** — No alignment control. The about editor SHALL offer no alignment control; its
  toolbar row holds only the Markdown format buttons.
- **FR-3** — About is always left-aligned. About SHALL render left-aligned in the editor's
  «Просмотр» tab and on `/authors/<id>`, for every profile; list markers sit at the left edge
  inside the text block, with no indent (approved mockup, user decision 2026-10-27).
- **FR-4** — Alignment is not stored. `public.author_profiles` SHALL have no `about_align`
  column; the about save action SHALL accept only the about text, and deleting about SHALL
  clear only the about text.
- **FR-5** — Poem list on the author page. On `/authors/<id>` for a public author, under the
  about section (or under the photo when there is no about), the page SHALL show a section
  with the level-2 heading «Произведения» followed by either a list of that author's poem
  titles, newest publication date first, each a link to `/authors/<id>/poems/<poemId>`, or,
  when the author has no poems, the text «У автора пока ещё нет публикаций.» and no list.
  The section SHALL be the same for every visitor.
- **FR-6** — No poem list page. `/authors/<id>/poems`, for any `<id>`, SHALL respond with
  HTTP 404 and the 404 page («Страница не найдена»), with no breadcrumb trail and no redirect.
  Nothing in the app SHALL link to it.
- **FR-7** — Poem page trail. On `/authors/<id>/poems/<poemId>`, the trail SHALL read Главная ›
  Наши авторы › <author name> › <poem title>, with the author's name linking to
  `/authors/<id>`. Its other rules (the «Автор» fallback, no trail on not-found, one shared
  read, last navigation wins) stay as they are.
- **FR-8** — Test data seed. `supabase/seed.sql` SHALL create five test readers, each with a
  confirmed email and a public author profile with a first name, a last name, and a Markdown
  about text, whose ids give them mock poems in email order: `author1@example.test` 0, `author2` 1,
  `author3` 2, `author4` 3, `author5` 4, plus one test
  reader whose profile has no name and is therefore not public. After
  `npx supabase db reset`, the local database SHALL hold exactly these readers and profiles.
- **NFR-1** — Design tokens only. New and changed styles use named design-token utilities: no
  colour literals and no Tailwind arbitrary-value colour classes.
- **NFR-2** — Server-rendered list, no dependency cycle. The author page's poem list SHALL be
  a Server Component with no `"use client"` module; `src/features/authors/` SHALL still import
  nothing from `@/features/poems`, and the route file SHALL compose the list into the author
  page.
- **NFR-3** — Rendering modes. `npm run build` SHALL succeed with no Supabase or Contentful
  environment variables; its route list SHALL equal `main`'s before this change minus exactly
  `/authors/[id]/poems`, and no route that wasn't fully dynamic before SHALL become so.
- **NFR-4** — Accessible author page. The author page's `main` region SHALL hold exactly one
  level-1 heading (the author's name); the poems section SHALL have the level-2 heading
  «Произведения», and its list SHALL be a `ul` whose every item holds one link.
- **NFR-5** — No leftovers. `src/` and `supabase/tests/` SHALL contain no reference to the
  alignment field or control (`about_align`, `aboutAlign`, `AboutAlign`, `AlignControl`,
  `ALIGN_LABELS`, `ALIGN_CLASSES`, `invalidAlign`), and `src/` and `tests/web-qa-scenarios/`
  SHALL contain no link to or expectation of the poem list page. The test seed's passwords are
  local-only placeholders and the seed is never pushed to a hosted project.
- **NFR-6** — Russian UI copy. The changed screens use only strings from the UI copy table,
  verbatim.

### Acceptance criteria

- **FR-1** — GIVEN the contact dialog is open and the message was delivered, WHEN the thank-you
  view appears, THEN after 3 seconds the dialog is closed, focus is on the «Связаться с нами»
  button, and the next open shows empty fields with no errors.
- **FR-1** — GIVEN the thank-you view is shown, WHEN the visitor activates «Закрыть» after 1
  second, THEN the dialog closes at once, and reopening it within the remaining 2 seconds
  shows the empty form that stays open past the original 3-second mark.
- **FR-1** — GIVEN the success arrived while the dialog was closed, WHEN the visitor opens it,
  THEN the thank-you view is shown and the dialog closes 3 seconds after that open.
- **FR-2** — GIVEN a signed-in author editing about, WHEN the editor tab renders, THEN no
  button «По левому краю», «По центру», or «По правому краю» is present.
- **FR-3** — GIVEN a public profile whose about is "## Поэт\n\n- первый\n- второй", WHEN a
  visitor opens `/authors/<id>`, THEN the heading «Поэт» and the list are left-aligned and the
  list markers sit at the left edge.
- **FR-4** — GIVEN the migrations are applied, WHEN the `author_profiles` columns are listed,
  THEN `about_align` is absent; AND GIVEN a save of about "Текст", WHEN the action runs, THEN
  the database write holds only `about`.
- **FR-5** — GIVEN a public author whose poems are «Осенний сад» (2026-03-12) and «Ночной
  вокзал» (2026-07-01), WHEN a visitor opens `/authors/<id>`, THEN after the about section a
  level-2 heading «Произведения» is followed by two links, «Ночной вокзал» then «Осенний сад»,
  each to its poem page, and no «Произведения автора» link exists.
- **FR-5** — GIVEN a public author with no poems, WHEN their page renders, THEN the heading
  «Произведения» and the text «У автора пока ещё нет публикаций.» are shown and no list.
- **FR-6** — GIVEN any id, valid or not, WHEN `/authors/<id>/poems` is requested directly,
  THEN the response is HTTP 404 with «Страница не найдена» and no trail.
- **FR-7** — GIVEN a public author «Анна Ахматова» and her poem «Осенний сад», WHEN a visitor
  opens the poem page, THEN the trail reads «Главная», «Наши авторы», «Анна Ахматова»,
  «Осенний сад».
- **FR-8** — GIVEN the local Supabase stack, WHEN `npx supabase db reset` runs, THEN `/authors`
  lists exactly the five seeded public authors, and their pages show 0, 1, 2, 3, and 4 poems.
- **NFR-1** — GIVEN the change is complete, WHEN the changed component files are searched for
  hex, `rgb(`, `hsl(` literals and `text-[`, `bg-[`, `border-[` classes, THEN there are no matches.
- **NFR-2** — GIVEN the change is complete, WHEN `src/features/poems/` is searched for
  `"use client"` and `src/features/authors/` for `@/features/poems`, THEN there are no matches.
- **NFR-3** — GIVEN no Supabase or Contentful variables, WHEN `npm run build` runs, THEN it exits 0
  and its route list is `main`'s minus exactly `/authors/[id]/poems`.
- **NFR-4** — GIVEN a public author with poems, WHEN the `main` region of `/authors/<id>` is
  queried by role, THEN it holds one level-1 heading, a level-2 heading «Произведения», and a
  list whose every item holds one link.
- **NFR-5** — GIVEN the change is complete, WHEN `src/`, `supabase/tests/`, and
  `tests/web-qa-scenarios/` are searched for the names NFR-5 lists, THEN there are no matches.
- **NFR-6** — GIVEN the changed screens, WHEN their headings, links, and texts are read, THEN each
  matches the UI copy table verbatim.

## UI copy

No new strings. Strings that stay, verbatim:

| Key | Text |
| --- | --- |
| Author page: poems section heading (level 2) | `Произведения` |
| Author page: author has no poems | `У автора пока ещё нет публикаций.` |
| Contact dialog: thank-you message (unchanged) | `Спасибо! Ваше сообщение отправлено.` |
| Contact dialog: close button (unchanged) | `Закрыть` |

Strings removed from the UI: `Произведения автора` (author page link), `По левому краю`,
`По центру`, `По правому краю` (alignment control), `Недопустимое выравнивание.` (alignment
validation message), and the breadcrumb item `Произведения` on the poem page.

## Mockups

Approved Claude Design canvas (2026-10-27): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83,
each artboard in light and dark at 1280 px and 375 px.

| Screen | Artboard |
| --- | --- |
| Author page `/authors/<id>`: poems section with poems (owner view), empty, no about (placeholder photo), loading, error | 12 · `/authors/[id]` — страница автора с разделом «Произведения» (`AuthorPoemsEntry.dc.html`) |
| Former poem list `/authors/<id>/poems`: 404, no trail | 13 · `/authors/[id]/poems` — страницы больше нет (404) (`PoemList.dc.html`) |
| Poem page: trail without «Произведения»; loading, not found, error | 14 · `/authors/[id]/poems/[poemId]` (`Poem.dc.html`) |
| About editor: «Редактор» tab without alignment, «Просмотр» tab left-aligned, over-limit counter and field error | 3 · `/account/author` — Профиль автора (редактор) (`AuthorEditor.dc.html`) |
| Contact dialog: thank-you view, annotated "closes by itself after 3 s; «Закрыть» closes at once; only this state closes itself" | 10 · Связаться с нами — подвал и диалог (`Contact.dc.html`), state 2e |

The mockup draws about's lists with `list-style-position: inside` and no left padding (markers
at the left edge, no indent); the code follows it (user decision, 2026-10-27).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contact-form`: FR-8 (success) gains the 3-second auto-close (FR-1).
- `author-profiles`: gains FR-22, the local test data seed (FR-8); FR-8 loses the alignment rule, FR-10 loses the alignment reset, FR-11 loses
  the alignment control, FR-14 renders about left-aligned (FR-2, FR-3, FR-4); the database
  integrity requirement states the column is gone.
- `author-poems`: NFR-1 names the single poem page and the poems section; FR-1 (poems entry) becomes the poem list on the author page (FR-5); FR-2 and
  FR-3 (poem list page, empty list page) are removed (FR-6); FR-5, FR-6, NFR-4, NFR-6 and NFR-7
  drop the list page.
- `breadcrumbs`: FR-2, FR-4, FR-12, FR-13 and NFR-5 drop the poem list route and the poem
  page's «Произведения» item (FR-7).

## Impact

- `src/features/contact/`: `ContactDialog` gains the auto-close timer; `contact.constants.ts`
  gains its delay.
- `src/features/authors/`: removed `AlignControl`, `ALIGN_LABELS`, `ALIGN_CLASSES`, the
  `.inlineLists` style, `AboutAlign`, the `align` field in the about schema and action, and
  `about_align` in columns, row types, mapping, and the delete patch. `AboutToolbarRow` is
  removed if it only wraps the format toolbar.
- `src/features/poems/`: `AuthorPoemsEntry` renders the list section; removed
  `AuthorPoemsPage`, `AuthorPoemsPageContent`, `AUTHOR_POEMS_LINK_LABEL`, and the public
  exports the breadcrumbs no longer need.
- `src/features/breadcrumbs/`: `matchRoute` and `buildTrail` lose the poem list route and the
  poem page's «Произведения» item.
- `src/app/`: `(public)/authors/[id]/poems/page.tsx` and
  `@breadcrumbs/authors/[id]/poems/page.tsx` are deleted.
- `supabase/`: a new migration drops `about_align`; `supabase/tests/author_profiles.test.sql`
  is updated; new `supabase/seed.sql`.
- `tests/web-qa-scenarios/`: the author poems scenarios and `poem-two-quick-clicks.spec.ts`
  start from the author page.
- Docs: `docs/architecture.md`, `docs/design-system.md` (alignment control and poems entry gone),
  `PROGRESS.md` (the QA user `qa-breadcrumbs@example.test` disappears with the reset).
- No new dependency and no environment variable. The hosted Supabase project has not been
  deployed yet, so dropping the column breaks no live data.
