# Test Plan

One row per acceptance criterion in `proposal.md` (two extra FR-1 rows cover rules the
contact-form delta states and the proposal's criteria imply). Levels: unit (a component, model,
action, or DAL function with its collaborators mocked), integration (a real local Supabase
database or a real production build), end-to-end (a real browser against the running app).

| Requirement | Tests | Level |
| --- | --- | --- |
| FR-1 — thank-you view closes the dialog after 3 s; focus on «Связаться с нами»; next open is an empty form | `ContactDialog` with fake timers: open at 2 900 ms, closed at 3 000 ms, reopen shows empty fields and no errors; browser pass: the dialog closes by itself and focus lands on the trigger | unit; end-to-end |
| FR-1 — «Закрыть» at 1 s cancels the timer; a reopen at 2 s stays open past the old 3 s mark | `ContactDialog` with fake timers: close at 1 000 ms, reopen at 2 000 ms, still open at 8 000 ms; browser pass: early «Закрыть» then reopen | unit; end-to-end |
| FR-1 — success while closed: the 3 s start at the next open | `ContactDialog` with fake timers: success while closed starts no timer, the dialog closes 3 000 ms after the next open | unit |
| FR-1 — activity inside the dialog neither pauses nor restarts the timer (contact-form FR-8) | `ContactDialog` with fake timers: pointer move, Tab, and a key press at 1 000 ms and 2 000 ms, still closed at 3 000 ms | unit |
| FR-1 — only the thank-you view auto-closes (contact-form FR-8, "No auto-close without success") | `ContactDialog` with fake timers: form shown, after a validation error, after a failure, each still open at 5 000 ms | unit |
| FR-2 — no alignment buttons in the editor | `AboutFieldEditor`: in the «Редактор» and «Просмотр» tabs, no button named «По левому краю», «По центру», «По правому краю»; the seven format buttons remain | unit |
| FR-3 — about heading and list left-aligned, markers at the left edge | `AuthorAbout`: the Markdown renders a level-2 heading and a list with no centre/right class on the container; `AuthorPage` full-profile case updated; browser pass on a seeded author | unit; end-to-end |
| FR-4 — `about_align` absent from `author_profiles` | pgTAP `hasnt_column('public', 'author_profiles', 'about_align')` after `db reset` | integration |
| FR-4 — a save of about writes only `about` | `saveAboutAction` with `{ about: "Текст", align: "justify" }` succeeds and calls the write with `{ about: "Текст" }`; the about delete writes `{ about: null }` | unit |
| FR-5 — author with poems: h2 «Произведения» then links newest first, no «Произведения автора» link | `AuthorPoemsEntry` / `AuthorPoemList`: heading level 2, two links in date order with poem-page hrefs, no old link; browser pass on `author5` | unit; end-to-end |
| FR-5 — author without poems: heading and «У автора пока ещё нет публикаций.», no list | `AuthorPoemsEntry` with no poems; browser pass on `author1` | unit; end-to-end |
| FR-6 — `/authors/<id>/poems` answers HTTP 404 with «Страница не найдена» and no trail | `matchRoute(["authors", id, "poems"])` is `none`; status code check on `npm run build && npm run start` for a seeded id and `not-a-uuid`; recorded scenario `author-poems-not-found` | unit; integration; end-to-end |
| FR-7 — poem page trail: Главная, Наши авторы, <author>, <poem> | `buildTrail` for an `author-poem` match: four items, the author links to `/authors/<id>`, fallback and not-found cases unchanged; recorded scenario `author-poems-reading-path` | unit; end-to-end |
| FR-8 — reset loads exactly the seed; `author1`…`author5` have 0…4 poems | Seed test: parses `supabase/seed.sql`, `mockPoemCount` per email gives 0…4 in order; after `npx supabase db reset`, six readers and six profiles, `/authors` lists five, `author1@example.test` signs in | unit; integration |
| NFR-1 — no colour literals or arbitrary colour classes in changed files | Static search in task 5.3 | unit |
| NFR-2 — no `"use client"` in poems, no `@/features/poems` import in authors | Existing `boundaries.test.ts` and `public-access.test.tsx` keep passing | unit |
| NFR-3 — env-less build passes; route list is `main`'s minus `/authors/[id]/poems` | `npm run build` without Supabase/Contentful variables, route list compared (task 5.2) | integration |
| NFR-4 — author page `main`: one h1, h2 «Произведения», list of links | `AuthorPoemsEntry` renders no h1 and an h2 + `ul` of links; role query on the `main` region in the browser pass | unit; end-to-end |
| NFR-5 — no alignment or list-page leftovers | Static search in task 5.3; `npm run knip` finds no unused export | unit |
| NFR-6 — copy matches the UI copy table | `AuthorPoemsEntry` and `ContactDialog` assertions use the table's strings verbatim; static copy check in task 5.3 | unit |
