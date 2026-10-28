# Test Plan

One row per acceptance criterion (a scenario's THEN) in this change's spec deltas. Levels:
**unit** (one module, its collaborators mocked), **integration** (a real local service: the
Supabase database, Storage, or a full Next build), **end-to-end** (a real browser against the dev
server, Gate 3 and recorded scenarios). Scenarios a MODIFIED block carries over unchanged keep their
existing tests and are listed once at the end.

## poem-management

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-1 | Public own profile on the account page | `AccountAuthorLinks` test: public profile renders «Управление произведениями» with `href="/account/poems"` | unit |
| FR-1 | Owner on their public author page | `AuthorOwnerLinkView` test: owner renders both links in order; `AuthorOwnerLink` test: uses `getOwnPublicAuthor` | unit |
| FR-1 | Nobody else sees it | `AuthorOwnerLinkView` test: non-owner renders nothing; `AccountAuthorLinks` test: no profile and not-public render no management link; web-qa: guest on `/authors/<id>` | unit, end-to-end |
| FR-2 | Author with poems | `MyPoemsContent` test: heading, add link, two links newest first with `/account/poems/<id>` | unit |
| FR-2 | Author without poems | `MyPoemsContent` test: heading and add link, no `ul` | unit |
| FR-2 | Only own poems | `MyPoemsContent` test: lists by the own `authorId`; pgTAP: select by `author_id` returns only that author's rows | unit, integration |
| FR-2, FR-3 | Profile without a last name | `MyPoemsContent` and `NewPoemContent` tests: `not-public` renders the notice and the editor link, no list, add link, or form | unit |
| FR-2, FR-3, FR-7 | Guest opens a management page | proxy test: `/account/poems`, `/account/poems/new`, `/account/poems/<id>` signed out → 307 `/login`; each page component test: `requireSession` called first; web-qa replay of `signed-out-account-redirect` extended to the three paths | unit, end-to-end |
| FR-3 | Form fields | `NewPoemForm` test: labels, field order, option order «—», sorted genres, «Без жанра», «—» selected; `poem-genres` DAL test: Russian sort | unit |
| FR-3 | Poem toolbar buttons | `NewPoemForm` test: toolbar buttons are exactly «Жирный», «Курсив», «Эпиграф», «Разделитель частей», «Отступ», in order; `MarkdownEditor` test: `formats` limits the buttons | unit |
| FR-3 | Epigraph | `markdown-format` test: `epigraph` prefixes `> `; `MarkdownText` test (`poem`): blockquote carries the epigraph class | unit |
| FR-3 | Part separator | `markdown-format` test: `separator` inserts `* * *` with one blank line each side, no extra blank lines; `MarkdownText` test: `hr` with the separator class | unit |
| FR-3 | Indent | `markdown-format` test: `indent` twice prefixes each selected line with two steps of two em spaces, unselected lines untouched; `MarkdownText` test: em spaces kept in the output | unit |
| FR-3 | Toolbar and preview in the text editor | `MarkdownEditor` test (shared): bold wraps the selection; preview with `variant="poem"` shows bold and two lines | unit |
| FR-3 | Chosen illustration | `NewPoemForm` test: picking a valid PNG shows the preview and «Убрать иллюстрацию» | unit |
| FR-3 | Removing the chosen illustration | `NewPoemForm` test: activating «Убрать иллюстрацию» clears the file and the preview | unit |
| FR-3 | Genres can't be read | `NewPoemContent` test: genres `unavailable` → `role="alert"` text, no form | unit |
| FR-4 | Empty form | `NewPoemForm` test: three «Обязательное поле.» errors, action not called, focus on title | unit |
| FR-4 | Whitespace only | `poem-form.schema` test: three spaces fail `required`; `NewPoemForm` test: error under title | unit |
| FR-4 | Title too long | `poem-form.schema` test: 81 fails, 80 passes; `NewPoemForm` test: input keeps 81 characters | unit |
| FR-4 | Indented first line kept | `poem-form.schema` test: leading empty line removed, leading em spaces kept; pgTAP: such a text is accepted | unit, integration |
| FR-4 | Line breaks count once | `poem-form.schema` test: `\r\n` and `\r` become `\n` before counting, 10000 with ten breaks passes; counter test: «10000 / 10000»; pgTAP: stored text of 10000 code points accepted | unit, integration |
| FR-4 | Title at the limit | `poem-form.schema` test: 80 code points pass; action test: valid input reaches `create_my_poem` | unit |
| FR-4 | Text over the limit | `MarkdownEditor` counter test: «10001 / 10000» in the danger colour; `NewPoemForm` test: «Не более 10000 символов.» | unit |
| FR-4 | Illustration rules | `validateImageFile` tests (shared): 6 MB and a renamed GIF rejected; `NewPoemForm` test: message under the picker; action test: server rejects, no upload | unit |
| FR-4 | Server checks a bypassed form | action test: empty title → `invalid` with the title error, no RPC, no upload | unit |
| FR-4 | Genre removed meanwhile | action test: id missing from `listPoemGenres` → `genre-unavailable`, no upload, no RPC; `NewPoemForm` test: option dropped, «—» selected, other drafts kept | unit |
| FR-5 | Successful create with an illustration | `createOwnPoem` test: upload path `<authorId>/<uuid>.jpg`, then `create_my_poem`; action test: `created` + id; `NewPoemForm` test: store set, `router.push("/account/poems/<id>")`; web-qa: full flow with a JPEG | unit, end-to-end |
| FR-5 | Successful create without an illustration | `createOwnPoem` test: no upload, path `null`; `PoemView` test: heading first, no image, no genre line; web-qa flow | unit, end-to-end |
| FR-5 | Notification only once | `CreatedPoemNotice` test: shows for the matching id, survives the store clear and Strict Mode, second mount shows nothing, effect cleanup marks dismissed; web-qa: reload, link away and back, browser Back/Forward | unit, end-to-end |
| FR-5 | Back to the form after a create | `NewPoemForm` test: drafts cleared before `router.push`; web-qa: Back shows an empty form | unit, end-to-end |
| FR-5 | Double submit | `NewPoemForm` test: two quick clicks call the action once; button «Добавление…» and disabled while pending | unit |
| FR-5 | Server unavailable | action test: RPC network error → `unavailable`; `NewPoemForm` test: alert text above submit, drafts kept | unit |
| FR-5 | Session expired | action test: `getSessionState` signed-out → `unauthenticated`, nothing called after; `NewPoemForm` test: «Сессия истекла. Войдите снова.» | unit |
| FR-5 | Illustration stored only with its poem | `createOwnPoem` test: RPC error or `over-limit` after upload → `remove` called; upload failure → no RPC | unit |
| FR-6 | Third poem in a minute | pgTAP: third `create_my_poem` within a minute → `over-limit`, no row; action test: `can_create_poem` over-limit → `too-many-poems`, no profile read, Contentful call, or upload | integration, unit |
| FR-6 | Twenty-first poem in a day | pgTAP: 20 rows backdated within 24 h → `over-limit` | integration |
| FR-6 | Window slides | pgTAP: rows backdated past one minute (fewer than 20 in 24 h) → `created` | integration |
| FR-6 | Failed attempts don't count | pgTAP: rejected calls (bad title) leave the count unchanged and a later call → `created`; action test: invalid illustration never calls an RPC | integration, unit |
| FR-6 | Direct calls can't bypass it | pgTAP: direct `insert into poems` rejected for `authenticated`; `create_my_poem` over the limit → `over-limit`; `poem_create_status` not executable by client roles | integration |
| FR-7 | Own poem | `OwnPoemContent` test: renders `PoemArticle` with the own poem; web-qa: same content as the public poem page | unit, end-to-end |
| FR-7 | Another author's poem | `own-poem` DAL test: another author's or malformed id → `not-found`; `OwnPoemContent` test: `notFound()` | unit |
| FR-7 | Read fails | `OwnPoemContent` test: `unavailable` throws (error screen) | unit |
| FR-11 | List read fails | `MyPoemsContent` test: list `unavailable` → heading, add link, alert, no list | unit |
| FR-11 | Profile read fails on the add page | `NewPoemContent` test: own-profile failure → alert, no form | unit |
| FR-12 | Fresh lists | action test: `updateTag("poems:<authorId>")` once after `created`, never on failure; web-qa: create, then `/account/poems` and `/authors/<own id>` list it first | unit, end-to-end |
| FR-13 | Slow list | `MyPoemsSkeleton`, `NewPoemSkeleton`, `PoemPageSkeleton` tests: `role="status"` «Загрузка…», blocks `aria-hidden` | unit |
| FR-13 | Reduced motion | skeleton tests: every block carries `motion-reduce:animate-none` | unit |
| NFR-1 | Direct table insert | pgTAP: `insert into poems` as `anon` and `authenticated` (own and foreign `author_id`) rejected | integration |
| NFR-1 | Create operation stores only for the caller | pgTAP: `create_my_poem` as owner → row's `author_id` is the caller's profile | integration |
| NFR-1 | Insert with a non-public own profile | pgTAP: `create_my_poem` with no last name → `not-public`, no row | integration |
| NFR-1 | Update and delete | pgTAP: `update` and `delete` on `poems` as the owner change nothing; checks reject blank, long, bad genre id, foreign path; bucket insert outside the own folder or malformed → `42501` | integration |
| NFR-1 | Hidden author | pgTAP: after clearing the last name, `anon` select returns no poem of that author | integration |
| NFR-2 | Static check | task 8.3 search: `"use client"` only in the form, its components, and the notice | unit |
| NFR-3 | Static check | task 8.3 searches for forbidden imports and duplicated helpers; ESLint `no-restricted-imports` | unit |
| NFR-6 | Literal search | task 8.3 search for colour literals and arbitrary colour classes | unit |
| NFR-7 | Error tied to its field | `NewPoemForm` test: `aria-invalid="true"`, `aria-describedby` → error id, focus on title | unit |
| NFR-7 | Focus after a server failure | `NewPoemForm` test: `genre-unavailable` → focus on the dropdown; `failed` → focus on the alert | unit |
| NFR-7 | Notification role | `CreatedPoemNotice` test: `role="status"` | unit |
| NFR-8 | Copy matches the table | messages test: every poem-management constant equals the UI copy table text; component tests assert copy through those constants; web-qa reads the rendered strings | unit, end-to-end |
| NFR-9 | Build without env | task 8.4: `npm run build` with no Supabase or Contentful variables, route list and render markers compared | integration |
| NFR-10 | Failed insert log | `createOwnPoem` and action tests: spied `console.error` output contains no title, text, file name, user id, profile id, or poem id; `poem-genres` test: a dropped entry logs its Contentful id only | unit |

## author-poems

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| FR-9 | Stored poems are listed | `author-poems` DAL test: rows mapped and ordered newest first; web-qa: seeded author5 shows 4 titles | unit, end-to-end |
| FR-9 | Publication date from creation time | `poem-row` mapping test: `2026-10-01T23:30:00Z` → `2026-10-01`; `PoemView` test: «1 октября 2026 г.» | unit |
| FR-9 | No mock poems | `AuthorPoemsEntry` test: empty list → empty text; task 3.3 search finds no mock module | unit |
| NFR-4 | One entry serves both areas | `author-poems` DAL test: `cacheTag("poems:<id>")` and one cached function for every caller; web-qa: public page then `/account/poems` on the local stack shows the same list | unit, end-to-end |
| NFR-4 | Failure is short-lived | `author-poems` DAL test: error → `unavailable` with `cacheLife("seconds")`, success → `"hours"` | unit |
| FR-12 | Public page after a create | action test: `updateTag` on the author's poems tag; web-qa: guest browser opens `/authors/<id>` after the create and sees the new title first | unit, end-to-end |
| NFR-5 | Script tag | `MarkdownText` test (shared): `<script>` source renders no `script` element; `PoemView` test with `variant="poem"` | unit |
| NFR-5 | Heading and list typed by hand | `MarkdownText` test (`poem`): `## ` and `- ` render no `h2`, `ul`, `li`, text kept | unit |
| NFR-5 | Link becomes text | `MarkdownText` test: link text only, no `a` | unit |
| FR-4 (modified) | Full poem | `PoemView` test: image with alt, heading, two paragraphs with kept lines, `<time>`, «Жанр: Лирика» | unit |
| FR-4 (modified) | No illustration | `PoemView` test: heading is the first element, no `img` | unit |
| FR-4 (modified) | No genre | `PoemPageContent` / `PoemArticle` test: `none` result → no «Жанр:» line; `poem-genres` test: `null` and unknown id → `none` | unit |
| FR-4 (modified) | Genre renamed | `poem-genres` test: name comes from the current list, not stored data | unit |
| FR-4 (modified) | Epigraph, separator, and indent | `PoemView` test: epigraph class on the blockquote, `hr` with `role="separator"` between stanzas, indented line keeps its em spaces; web-qa: visual check against the mockup | unit, end-to-end |
| FR-4 (modified) | Markdown is rendered | `PoemView` test: bold element and a kept soft line break | unit |
| FR-4 (modified) | Markup is not interpreted | `PoemView` test: `<b>` source renders no `b` element, "plain" shown | unit |
| FR-4 (modified) | Date does not depend on the server's time zone | existing `format-published-date` test, plus the mapping test above with `TZ` behind UTC | unit |
| FR-5 (modified) | Poem that isn't the author's | `author-poems` DAL test: another author's id, "no-such-poem", random UUID, uppercase id → `not-found`, non-UUID with no query; web-qa replay of `author-poems-not-found` | unit, end-to-end |
| FR-5 (modified) | Poem read unavailable | `PoemPageContent` test: `unavailable` throws | unit |
| FR-1 (modified) | Poems unavailable | `AuthorPoemsEntry` test: «Произведения сейчас недоступны.», no list | unit |
| NFR-3 (modified) | Static check | task 8.3 search: only `src/features/poems/dal/` reads the `poems` table; no mock module | unit |

## author-profiles, reader-account, breadcrumbs

| Requirement | Criterion | Tests | Level |
| --- | --- | --- | --- |
| author-profiles FR-15 | Owner | `AuthorOwnerLinkView` test: both links, in order, owner only | unit |
| author-profiles FR-15 | Other visitor | `AuthorOwnerLinkView` test: no links | unit |
| FR-14 (author-profiles FR-22) | Reset loads exactly the seed | after `npx supabase db reset`: counts of users, profiles, poems (10) | integration |
| FR-14 (author-profiles FR-22) | Every poem count is covered | after reset: per-author poem counts 0..4; web-qa: author1 empty, author5 four titles with former dates | integration, end-to-end |
| reader-account FR-1 | No profile yet / Profile exists but is not public | `AccountAuthorLinks` test: no management link | unit |
| reader-account FR-1 | Public profile | `AccountAuthorLinks` test: three links with their hrefs | unit |
| FR-8 (breadcrumbs FR-2) | Poem management trails | `buildTrail` and `matchRoute` tests: the three trails, links and current item; slot-page test | unit |
| FR-8 (breadcrumbs FR-2) | Owner's poem that isn't theirs | `buildTrail` test: `getOwnPoemTitle` not-found → no trail | unit |
| FR-8 (breadcrumbs FR-2) | Owner's poem read unavailable | `buildTrail` test: unavailable → ends at «Управление произведениями» as current | unit |
| FR-8 (breadcrumbs FR-5) | Signed-in and signed-out visitors see the same trail | existing test unchanged; `own-poem` loader test: no `requireSession` call | unit |

Carried over unchanged, existing tests stay: author-poems FR-4 "Date does not depend on the server's
time zone" (above, extended); FR-5 "Former poem list URL", "Unknown or malformed author", "Author
service unavailable"; FR-1 "Author with poems", "Author without poems", "Placement without about",
"Following a title", "Same entry for the owner and other readers" (their fixtures move from mock
poems to DAL mocks in task 3.3); author-profiles FR-22 "A seeded reader can sign in"; reader-account
FR-1 "Every field deleted", "Profile can't be loaded"; breadcrumbs FR-2's eight unchanged route
scenarios.

Coverage: every scenario of the five deltas has a row or is listed as carried over (105 criteria,
none without a test).
