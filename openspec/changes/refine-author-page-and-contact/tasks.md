# Tasks

Order: groups 1 and 2 add no new visuals and may run before the Claude Design mockups arrive;
groups 3 and 4 change screens; their mockups were approved on 2026-10-27 (proposal.md, ## Mockups). Each
group removes or exports only what it already consumes, so `npm run knip` stays green per group
PR. The column drop (group 3) lands with the code that stops reading it, never before.

## 1. Test data seed (no new visuals) <!-- judgement-heavy -->

- [x] 1.1 (FR-8) Write `supabase/seed.sql` (design D5): six test readers in `auth.users` with
  matching `auth.identities` rows (fixed UUIDs, confirmed emails `author1@example.test` …
  `author5@example.test` and `draft-author@example.test`, one placeholder password hashed with
  `crypt(..., gen_salt('bf'))`, documented in the header as local-only and never pushed), and
  their six `public.author_profiles` rows: five public (fictional Russian first and last names,
  a Markdown about holding a `##` heading and a `-` list) whose fixed ids give `mockPoemCount`
  0, 1, 2, 3, and 4 in email order (`author1` 0 … `author5` 4), and one with no names. Insert no `about_align` value, so the seed works
  before and after the group 3 migration.
  - Verify with `src/features/poems/tests/dal/seed-poem-counts.test.ts` (implements FR-8 of
    refine-author-page-and-contact): reads `supabase/seed.sql`, extracts the five public
    profile ids, and checks that `mockPoemCount` gives `author1@example.test`'s profile 0, `author2` 1,
    `author3` 2, `author4` 3, and `author5` 4.
- [x] 1.2 (FR-8) Reset the local database and check the seed: `npx supabase db reset` exits 0;
  `auth.users` holds exactly six rows and `public.author_profiles` six; `npx supabase test db`
  passes; `/authors` on the dev server lists exactly the five public authors; signing in as
  `author1@example.test` opens `/account/author` with that profile.

## 2. Contact dialog auto-close (no new visuals) <!-- isolated -->

- [x] 2.1 (FR-1) Add `SENT_AUTO_CLOSE_MS = 3000` to `contact.constants.ts` and the `isOpen`
  state and timer effect to `ContactDialog` (design D1): `open()` sets `isOpen`;
  `handleClosed` clears it first, before its `if (!sent) return;`; the effect closes the dialog
  through `dialogRef` 3 s after `sent && isOpen` and clears the timer on cleanup.
  - Verify with `src/features/contact/tests/components/ContactDialog.test.tsx` (implements FR-1
    of refine-author-page-and-contact), fake timers, `showModal`/`close` stubbed as the existing
    contact tests do: after a success the dialog is still open at 2 900 ms and closed at
    3 000 ms, and the next open shows empty fields; «Закрыть» at 1 000 ms then a reopen at
    2 000 ms leaves the dialog open at 8 000 ms; a success while closed starts no timer, and
    the dialog closes 3 000 ms after the next open. Pointer movement, a Tab press, and a key press inside the dialog at 1 000 ms and
    2 000 ms leave it closing at 3 000 ms, no later. With the form shown, after a validation error, and after a failure, the dialog is still
    open at 5 000 ms. The existing FR-8 cases still pass.

## 3. Remove alignment end to end (UI) <!-- judgement-heavy -->

Mockups approved 2026-10-27 (proposal.md, ## Mockups).

- [x] 3.1 (FR-4) Add the migration `supabase/migrations/<timestamp>_drop_about_align.sql`
  (`alter table public.author_profiles drop column about_align;`, with a documented down
  migration in its header, design D2) and update `supabase/tests/author_profiles.test.sql`:
  remove `about_align` from the `returning` list and the `about_align = 'justify'` case, add
  `hasnt_column('public', 'author_profiles', 'about_align')`.
  - Verify: `npx supabase db reset && npx supabase test db` passes (implements FR-4 of
    refine-author-page-and-contact, in the pgTAP file).
- [x] 3.2 (FR-4) Remove alignment from the model, DAL, and action (design D2): `AboutAlign`,
  `alignSchema`, the `align` field of `saveAboutSchema`, `about_align` in `profileRowSchema`,
  `OWNER_PROFILE_COLUMNS`, the row and profile types, the `profile-queries.ts` mapping,
  `VALIDATION_MESSAGES.invalidAlign`, and the delete patch (now `{ [field]: null }` for every
  field); `saveAboutAction` writes `{ about }`.
  - Verify with `src/features/authors/tests/actions/author-profile.actions.test.ts` and
    `tests/dal/author-profile-writes.test.ts` (implements FR-4 of
    refine-author-page-and-contact): a save of `{ about: "Текст", align: "justify" }` succeeds
    and writes only `{ about: "Текст" }`; deleting about writes only `{ about: null }`. Update the
    existing tests that pass or expect alignment, and drop the "Invalid alignment" schema case.
- [x] 3.3 (FR-2, FR-3) Remove alignment from the UI (design D2): delete `AlignControl` and
  `AboutToolbarRow` (and their types and tests); `AboutEditForm` renders `MarkdownToolbar`
  directly; `AboutPreview` renders only `AuthorAbout`; `AboutFieldEditor`'s draft and saved
  value become the Markdown string and `savedAlign` goes from it and `AuthorProfileEditor`;
  `AuthorAbout` takes `markdown` only; delete `ALIGN_LABELS`, `ALIGN_CLASSES`, and the
  `.inlineLists` class; `.about ul`/`.about ol` get `padding-left: 0` and
  `list-style-position: inside` (mockup artboard 3 and 12).
  - Verify with `src/features/authors/tests/components/AboutFieldEditor.test.tsx` and
    `AuthorAbout.test.tsx` (implements FR-2 and FR-3 of refine-author-page-and-contact): in both
    editor tabs no button is named «По левому краю», «По центру», or «По правому краю»; the
    seven format buttons are still present; `AuthorAbout` with "## Поэт\n\n- первый\n- второй"
    renders a level-2 heading and a list, with no `text-center`/`text-right` class on the about
    container. Update `AuthorPage.test.tsx`'s centred-heading case to the left-aligned one.

## 4. Poem list on the author page and the list route removed (UI) <!-- judgement-heavy -->

Mockups approved 2026-10-27 (proposal.md, ## Mockups).

- [ ] 4.1 (FR-5, NFR-2, NFR-4) `AuthorPoemsEntry` renders `AuthorPoemList` with
  `listAuthorPoems(id)` (design D3); `AuthorPoemList`'s heading becomes an `h2` at the mockup's section
  scale (24/32, weight 600, -0.01em) with 16 px to the list (artboard 12); delete `AUTHOR_POEMS_LINK_LABEL`. The route file
  `src/app/(public)/authors/[id]/page.tsx` stays unchanged.
  - Verify with `src/features/poems/tests/components/AuthorPoemsEntry.test.tsx` and
    `AuthorPoemList.test.tsx` (implements FR-5 and NFR-4 of refine-author-page-and-contact): two
    poems render a level-2 heading «Произведения» and a `ul` of two links, newest first, each
    to its poem page, and no «Произведения автора» link; no poems render the heading and «У
    автора пока ещё нет публикаций.» with no list; no level-1 heading is rendered by the
    section. `public-access.test.tsx` and `boundaries.test.ts` keep passing (NFR-2).
- [ ] 4.2 (FR-7, FR-6) Breadcrumbs (before 4.3, which removes the poems exports the trail still imports) (design D4): `matchAuthorRoute` no longer matches
  `[id, "poems"]`; the `RouteMatch` union loses `author-poems`; `BreadcrumbsLoader`'s
  `readForMatch` loses that case; `buildTrail`'s `author-poem` trail drops the «Произведения»
  item, and `build-trail.ts` stops importing `authorPoemsPath` and `POEMS_PAGE_TITLE`.
  - Verify with `src/features/breadcrumbs/tests/model/match-route.test.ts` and
    `build-trail.test.ts` (implements FR-6 and FR-7 of refine-author-page-and-contact):
    `["authors", id, "poems"]` matches `none`; the poem trail is Главная › Наши авторы ›
    <author name> (link to `/authors/<id>`) › <poem title>; the «Автор» fallback and not-found
    cases keep their results without the «Произведения» item. Remove the poem-list cases.
- [ ] 4.3 (FR-6) Delete `src/app/(public)/authors/[id]/poems/page.tsx`,
  `src/app/@breadcrumbs/authors/[id]/poems/page.tsx`, `AuthorPoemsPage`, and
  `AuthorPoemsPageContent` (with their types and tests); delete `authorPoemsPath` (inline its
  path into `authorPoemPath`) and drop `AuthorPoemsPage`, `authorPoemsPath`, and
  `POEMS_PAGE_TITLE` from `src/features/poems/index.ts`.
  - Verify with `src/features/poems/tests/model/poem-paths.test.ts` (unchanged `authorPoemPath`
    output) and `src/app/tests/breadcrumbs-slot.test.ts` (implements breadcrumbs NFR-5: real
    and slot pages still mirror, with no `authors/[id]/poems` page in either).
- [ ] 4.4 (FR-5, FR-6, FR-7) Update the recorded browser scenarios under
  `tests/web-qa-scenarios/`: `author-poems-reading-path.spec.ts` goes author page → poem
  (no list page) and checks the short trail; `author-poems-not-found.spec.ts` adds the HTTP 404
  for `/authors/<id>/poems`; `poem-two-quick-clicks.spec.ts` starts from the author page's
  «Произведения» section.

## 5. Docs and verification <!-- judgement-heavy -->

- [ ] 5.1 (FR-2, FR-6, FR-8) Update docs: `docs/architecture.md` (the list route, `authorPoemsPath`, and
  `POEMS_PAGE_TITLE` mentions), `docs/design-system.md` (no alignment control; the poems entry
  is now the author page's poems section), and `PROGRESS.md`'s note on the QA user
  `qa-breadcrumbs@example.test`, which the reset removed (via the progress script, not by hand).
- [ ] 5.2 (FR-6, NFR-3) On `npm run build && npm run start`: the build's route list equals
  `main`'s before this change minus exactly `/authors/[id]/poems`, with `/authors/[id]` and
  `/authors/[id]/poems/[poemId]` keeping their render-mode marker; the build also succeeds with
  no Supabase or Contentful variables; `curl -s -o /dev/null -w '%{http_code}'` on
  `/authors/<seeded id>/poems` and `/authors/not-a-uuid/poems` prints `404`, and the page
  shows «Страница не найдена» with no trail. If the status is 200, stop and revise design D3
  (Risks: soft vs hard 404).
- [ ] 5.3 (NFR-1, NFR-5, NFR-6) Static checks: the changed component files hold no hex,
  `rgb(`, `hsl(` literals and no `text-[`, `bg-[`, `border-[` classes; `src/` and
  `supabase/tests/` hold none of `about_align`, `aboutAlign`, `AboutAlign`, `AlignControl`,
  `ALIGN_LABELS`, `ALIGN_CLASSES`, `invalidAlign`; `src/` and `tests/web-qa-scenarios/` hold no
  `authorPoemsPath`, `AuthorPoemsPage`, or «Произведения автора»; the changed screens' strings
  match the proposal's UI copy table.
- [ ] 5.4 (FR-1, FR-3, FR-5, FR-6, FR-7) In the Gate 3 browser pass, check against the approved
  mockups: the contact dialog closes by itself 3 s after the thank-you view and focus lands on
  «Связаться с нами»; «Закрыть» before 3 s cancels it; the about editor has no alignment
  control and the public about is left-aligned; on the seeded authors with 0 and 4 poems the section matches the approved
  Claude Design mockup visually and shows the right content (the empty text for `author1`, four
  titles newest first for `author5`); the old list URL shows the 404 page with no trail; the poem page trail has
  four items. Save the passing contact and author page flows as scenarios.
- [ ] 5.5 (FR-1..FR-8, NFR-1..NFR-6) Run the full validation: `npm run typecheck && npm run lint && npm run test:coverage
  && npm run build && npm run knip`.
