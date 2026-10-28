# Tasks

Order: group 1 moves the shared building blocks out of `authors` with no behaviour change, so the
profile editor is green before anything new depends on them. Group 2 is the database. Groups 3
and 4 are server-side code with no new visuals. Groups 5-7 add or change screens and wait for the
approved Claude Design link (`docs/claude-design.md`). Group 8 is docs and verification. Each
group exports only what it already consumes (tests count as consumers for knip), so
`npm run knip` stays green per group PR. Slot pages for the new routes land with the routes
(group 6), because `app/tests/breadcrumbs-slot.test.ts` requires one per real page.

## 1. Shared building blocks and the own-author read (no visible change) <!-- judgement-heavy -->

- [x] 1.1 (NFR-3) Move the pure Markdown and text helpers (design D1): `markdown-format.ts` →
  `src/shared/lib/markdown/`, `trimmed-length.ts` → `src/shared/lib/text/`; move their tests to
  the matching `tests/` folders; update the authors imports.
  - Verify: the moved tests pass unchanged apart from import paths.
- [x] 1.2 (NFR-3) Move the image file check (design D1): `validate-photo-file.ts`,
  `detect-image-type.ts`, `PHOTO_FORMATS`, `PHOTO_MAX_BYTES` → `src/shared/lib/image-file/`
  (`validateImageFile`, `IMAGE_FORMATS`, `IMAGE_MAX_BYTES`); `use-photo-draft.ts` and
  `object-url-store.ts` → `src/shared/lib/image-file/use-image-draft.ts` (+ store);
  `PhotoPicker` → `src/shared/ui/ImagePicker/` with a `buttonLabel` prop. Authors keep their
  messages and pass «Выбрать фото».
  - Verify with the moved tests, plus `src/features/authors/tests/` unchanged and green.
- [x] 1.3 (NFR-3, FR-10) Move the Markdown editor and renderer (design D1, D6):
  `AboutTextarea`, `MarkdownToolbar`, `AboutViewTabs`, `AboutPreview`, and the counter →
  `src/shared/ui/MarkdownEditor/` (`maxLength`, `label`, `id`, `errorId`, `formats`, `variant`
  props); `AuthorAbout` + `about-markdown.ts` → `src/shared/ui/MarkdownText/` (`variant`, default
  `"about"`); the `epigraph`, `separator`, and `indent` formats in `markdown-format.ts` and the
  `"poem"` variant (design D6). The toolbar and tab strings move to `shared/ui`'s messages verbatim.
  `AboutFieldEditor` composes them with the about label and `ABOUT_MAX_LENGTH`.
  - Verify with `src/shared/ui/tests/MarkdownEditor.test.tsx` and `MarkdownText.test.tsx`
    (moved author-profiles FR-11 and NFR-1 cases; implements FR-10 of add-poem-creation:
    `"poem"` keeps a single `\n` as a visible line break, `"about"` doesn't; `"poem"` renders
    `blockquote` as an epigraph, `hr` as «* * *», hand-typed headings and lists as text, and keeps
    leading em spaces; `formats` limits the toolbar; the three new transforms: epigraph
    prefix, separator with one blank line each side, indent per selected line), and the
    authors editor tests unchanged and green.
- [x] 1.4 (NFR-3) Move the Supabase error classifier (design D1): `classify-profile-error.ts` →
  `src/shared/lib/supabase/classify-error.ts` (`classifySupabaseError`). The write-allowance DAL
  stays in `authors`.
  - Verify with the moved classifier tests and the existing authors cases.
- [x] 1.5 (NFR-3, FR-1) Wrap `getMyAuthorProfile` in React `cache`; add `getOwnPublicAuthor()` in
  `src/features/authors/dal/own-public-author.ts` on top of it (design D4); the `@/features/authors`
  export lands with its first consumer in 4.2 (knip, group 1); only `AuthorOwnerLink` switches to it (`AccountAuthorSection` keeps
  `getMyAuthorProfile` for its three states).
  - Verify with `src/features/authors/tests/dal/own-public-author.test.ts`: public, no row, missing
    last name, each failure kind; two calls in one request read once. The existing account and
    owner-link tests stay green.
  - Scaffold clean-up: remove `src/features/authors/dal/own-public-author.ts` from `knip.jsonc`'s
    `ignoreFiles` and the `@public` tag on `OwnPublicAuthorResult`; `npm run knip` passes. Triage any unused-export finding (remove the export or use it) instead of re-adding an ignore.
- [x] 1.6 (NFR-3, FR-1) Verify: `npm run typecheck && npm run lint && npm run test:coverage && npm run build &&
  npm run knip` pass; `rg "detectImageType|MarkdownToolbar|PGRST301" src/features` finds only imports from
  `@/shared`.

## 2. Database: poems, illustrations bucket, limits, seed <!-- judgement-heavy -->

- [x] 2.1 (NFR-1, FR-5) Migration `supabase/migrations/<ts>_poems.sql` (design D2): `public.poems`
  with checks and index, RLS, the select policy, select-only column grants;
  `is_public_author_profile(uuid)` and the `author_profiles` public policy rewritten to use it;
  `owns_public_author_folder(text)`; the `poem-illustrations` bucket and its policies; documented
  down migration. Mirror the bucket in `supabase/config.toml`.
- [x] 2.2 (FR-5, FR-6) In the same migration: `create_my_poem(title, text, genre_id,
  illustration_path)` and `can_create_poem()` (design D2): caller from `auth.uid()`, public own
  profile from `my_author_profile_id()`, advisory lock, and the internal `poem_create_status(profile)`
  holding the public check and the 2-per-minute and 20-per-day counts from `poems.created_at`;
  jsonb status.
- [x] 2.3 (NFR-1, FR-6) pgTAP `supabase/tests/poems.test.sql` (design D13; implements NFR-1 and
  FR-6 of add-poem-creation): direct insert, update, and delete on `poems` rejected for `anon` and
  `authenticated`; `create_my_poem` as anon fails; with a non-public own profile → `not-public`;
  as the owner → `created`, row owned by the caller's profile; blank title, 81-character title,
  10001-character text, malformed `genre_id`, foreign illustration path rejected; the 3rd call in
  a minute and the 21st in a day (rows backdated by the test) → `over-limit`, no row;
  `can_create_poem` agrees; `poem_create_status` is not executable by `anon` or `authenticated`; a poem of a profile that lost its last name is invisible to `anon`;
  bucket insert outside the own folder or with a malformed folder rejected with the RLS error
  `42501` (`throws_ok`), never a uuid-cast error `22P02`.
  `supabase/tests/author_profiles.test.sql` and `write_rate_limits.test.sql` keep passing
  unchanged.
- [x] 2.4 (FR-14) Seed (design D12): insert the four former mock poems as rows for author2..author5
  (1, 2, 3, 4 poems) with fixed ids (design D12), `genre_id null`, no illustration, `created_at` = the former `publishedAt` at
  12:00 UTC, each author the first N poems in the former set's order (design D12); update the seed's header comment.
  - Verify: `npx supabase db reset` then `npx supabase test db` pass; `select count(*) from
    public.poems` is 10.

## 3. Poems read side from the database (server, no new visuals) <!-- judgement-heavy -->

- [x] 3.1 (FR-9, NFR-4, FR-11) Rewrite `src/features/poems/dal/author-poems.ts` (design D3):
  `cachedAuthorPoems` with `"use cache"`, `cacheTag(poemsTag(authorId))`, the public client, Zod
  row schema in `model/poem-row.schema.ts` (ADR 0001), the mapping in `dal/poem-row.ts`, `"hours"` / `"seconds"` lifetimes; `listAuthorPoems` and
  `getAuthorPoem` in React `cache`; UUID guards; new `Poem`, `AuthorPoemsResult`,
  `AuthorPoemResult` types; `model/poem-cache-tags.ts`.
  - Verify with `src/features/poems/tests/dal/author-poems.test.ts` (implements FR-9 and NFR-4
    of add-poem-creation): order newest first; `publishedAt` is the UTC date of `created_at`;
    illustration URL from the bucket or `null`; tag `poems:<authorId>` set on every outcome;
    success → `"hours"`, error → `unavailable` + `"seconds"`, logged without content (NFR-10);
    a non-UUID or uppercase `poemId` → `not-found` with no query; two calls in one request query
    once.
  - Scaffold clean-up: remove `poem-row.ts`, `poem-row.schema.ts`, and `poem-cache-tags.ts` from `knip.jsonc`'s `ignoreFiles` and
    the `@public` tag on `AuthorPoemsResult`. Triage any unused-export finding (remove the export or use it) instead of re-adding an ignore.
- [x] 3.2 (FR-10, FR-3) Genres DAL `src/features/poems/dal/poem-genres.ts` (design D5):
  `listPoemGenres` and `getPoemGenreName` with the result-dependent Contentful scope.
  - Verify with `src/features/poems/tests/dal/poem-genres.test.ts`: sorted by Russian name;
    an invalid item dropped and logged by id; Contentful failure → `unavailable` with `"seconds"`;
    `getPoemGenreName` for `null`, a known id, an unknown id, and an unavailable list.
  - Scaffold clean-up: remove `poem-genres.ts` from `knip.jsonc`'s `ignoreFiles` and the `@public` tags on
    `PoemGenre`, `PoemGenresResult`, `PoemGenreName`. Triage any unused-export finding (remove the export or use it) instead of re-adding an ignore.
- [x] 3.3 (FR-9, FR-10, FR-11, NFR-3) Delete `mock-poems.ts`, `mock-poem-count.ts`, their tests, and
  `public/mock-poems/`; adapt the components to the new types with no visual change (Gate 2,
  2026-10-28): `PoemView` renders the illustration only when `illustrationUrl` is set and the genre
  line from a `getPoemGenreName` result passed in by `PoemPageContent` (left out for `none`), text
  still plain; `PoemPageContent` throws on `unavailable`; `AuthorPoemsEntry` shows
  «Произведения сейчас недоступны.» (copy constant added here) on `unavailable` in the existing
  section markup. Markdown and the `PoemArticle` / `PoemTitleList` / `PoemPageSkeleton` extraction
  stay in group 5.
  - Verify: `rg "mock-poem" src public` finds nothing; `PoemView.test.tsx` covers no illustration
    (heading first) and no genre; `AuthorPoemsEntry.test.tsx` covers unavailable; existing
    component tests updated to the new data shapes still pass.

## 4. Poem management server side (no new visuals) <!-- judgement-heavy -->

- [ ] 4.1 (FR-4, NFR-8) `src/features/poem-management/model/`: `poem-form.schema.ts`, constants
  (`TITLE_MAX_LENGTH = 80`, `TEXT_MAX_LENGTH = 10000`, `NO_GENRE`, bucket),
  types, messages (every UI copy table string this feature shows, verbatim), paths.
  - Verify with `src/features/poem-management/tests/model/poem-form.schema.test.ts` (implements
    FR-4 of add-poem-creation): required, whitespace-only, 80/81 title, 10000/10001 text, code
    points not UTF-16 units, `NO_GENRE` → `null`, trimming.
- [ ] 4.2 (FR-7, FR-8) `dal/own-poem.ts`: `getOwnPoem(poemId)` and `getOwnPoemTitle(poemId)` in
  React `cache`, over `getOwnPublicAuthor` and `getAuthorPoem` (design D4); export
  `getOwnPublicAuthor` from `@/features/authors`' index (left out in group 1: no consumer yet).
  - Verify with `tests/dal/own-poem.test.ts`: own poem; another author's or malformed id →
    `not-found`; not public → `not-found`; signed out meanwhile and failures → `unavailable`; page and title
    calls in one request read once.
- [ ] 4.3 (FR-5, FR-6, NFR-1, NFR-10) `dal/poem-writes.ts`: `checkCanCreatePoem` (`can_create_poem`
  RPC) and `createOwnPoem` (upload, `create_my_poem` RPC, best-effort cleanup) with the cookie
  client, failures through `classifySupabaseError`.
  - Verify with `tests/dal/poem-writes.test.ts`: jsonb statuses parsed with Zod (an unexpected
    shape → `unknown`); with and without an illustration; RPC failure or `over-limit` removes the
    upload; upload failure calls no RPC; the path is `<authorId>/<uuid>.<ext>` from the sniffed
    type; logs carry no title, text, file name, user id, profile id, or poem id.
- [ ] 4.4 (FR-5, FR-6, FR-12) `actions/create-poem.actions.ts` + `action-client.ts` (design D7). Pick one
  channel for server field errors (Gate 2b, 2026-10-28): either every field error through next-safe-action's
  `validationErrors` (`returnValidationErrors` for genre and illustration) or parsing inside the body and
  returning `invalid`; make `CreatePoemResult` and design D7 say which, so `NewPoemForm` reads one shape.
  - Verify with `tests/actions/create-poem.actions.test.ts` (implements FR-5, FR-6, FR-12 of
    add-poem-creation): invalid input → field errors, no RPC call; no session →
    `unauthenticated`; `can_create_poem` over limit → `too-many-poems`, no profile read, no
    Contentful call, no upload, no `updateTag`; not-public → `unknown`; unknown genre →
    `genre-unavailable`; bad illustration → field error, no upload; `create_my_poem` over limit
    (race) → `too-many-poems`; success → `updateTag("poems:<id>")` once and `{ status: "created",
    poemId }`; any failure → no `updateTag`.
- [ ] 4.5 (FR-4, FR-5, FR-6, FR-12, NFR-10) Verify: `npm run typecheck && npm run lint && npm run test:coverage && npm run build &&
  npm run knip`.

## 5. Poem page and author page section (UI) <!-- judgement-heavy -->

- [ ] 5.1 (FR-10, NFR-5) `PoemView`: text through `MarkdownText variant="poem"` (the optional
  illustration and genre landed in 3.3); the illustration fills a 16:9 frame, cropped (`aspect-video
  object-cover` instead of `h-auto`, author-poems FR-4); export `PoemArticle` for the owner's page (design D4).
  - Verify with `src/features/poems/tests/components/PoemView.test.tsx` (implements FR-10 and
    NFR-5 of add-poem-creation): with and without an illustration (heading first; the image carries
    the 16:9 cropping classes); genre named,
    none; Markdown bold; a single line break kept; `<script>` and a link rendered as text.
  - Scaffold clean-up: remove `PoemArticle/**` from `knip.jsonc`'s `ignoreFiles` (the scaffolded
    `PoemArticle.tsx` and `PoemArticle.types.ts` are filled in here).
- [ ] 5.2 (FR-11, FR-13) `AuthorPoemList` → `PoemTitleList` (href per poem passed in); `PoemPage`'s
  inline fallback → `PoemPageSkeleton`; restyle the unavailable state from 3.3 per the mockup.
  - Verify with `tests/components/PoemTitleList.test.tsx` and `AuthorPoemsEntry.test.tsx`: list,
    empty, unavailable, hrefs.
  - Scaffold clean-up: fill in the scaffolded `PoemPageSkeleton.tsx`; remove `PoemPageSkeleton/**` from
    `knip.jsonc`'s `ignoreFiles`.
- [ ] 5.3 (FR-10, FR-11, NFR-5, NFR-6) Verify: typecheck, lint, coverage, build, knip.

## 6. Poem management pages, form, links (UI) <!-- judgement-heavy -->

- [ ] 6.1 (FR-2, FR-11, FR-13, NFR-7) `MyPoemsPage` (+ content, skeleton) and `NotPublicNotice`;
  route `app/(authorized)/account/poems/page.tsx`; slot page `app/@breadcrumbs/account/poems/page.tsx`
  (static trail for now; group 7 adds the labels).
  - Verify with `tests/components/MyPoemsContent.test.tsx` (implements FR-2 and FR-11 of
    add-poem-creation): list newest first with `/account/poems/<id>` links; empty; not public;
    profile failure; list unavailable keeps the add link; skeleton has `role="status"`
    «Загрузка…» and `motion-reduce:animate-none`.
- [ ] 6.2 (FR-3, FR-4, FR-5, NFR-7) `NewPoemPage` (+ content, skeleton) loading genres server-side,
  and the client `NewPoemForm` on `MarkdownEditor` and `ImagePicker` (design D8); route
  `…/account/poems/new/page.tsx` and its slot page.
  - Verify with `tests/components/NewPoemForm.test.tsx` (implements FR-3, FR-4, FR-5 of
    add-poem-creation; action mocked): field order and labels; option order «—», genres,
    «Без жанра»; empty submit → three errors, no action call, focus on title, `aria-invalid` and
    `aria-describedby`; 81-character title kept in the input; counter over 10000 in the danger
    colour; bad illustration message; pending text and disabled button, one call on double click;
    failure alert keeps drafts; `created` → store set and `router.push("/account/poems/<id>")`.
    And `NewPoemContent.test.tsx`: genres unavailable alert, not public, profile failure.
- [ ] 6.3 (FR-7, FR-5) `OwnPoemPage` + `CreatedPoemNotice` + `created-poem-notice-ui.store.ts` (design D8);
  route `…/account/poems/[poemId]/page.tsx` and its slot page.
  - Verify with `tests/components/OwnPoemContent.test.tsx` (own poem renders `PoemArticle`;
    other author's or malformed id → `notFound`; failure throws) and
    `CreatedPoemNotice.test.tsx` (shows for the matching id with `role="status"` and stays shown after
    the store is cleared, under Strict Mode too; a second mount shows nothing; nothing for another id).
  - Scaffold clean-up: remove `src/features/poem-management/**` and then the empty `ignoreFiles` key with its
    comment from `knip.jsonc`; drop `zustand` from `ignoreDependencies` (the notice store uses it) with its
    comment; remove the `@public` tag on `poems/index.ts`'s `Poem`, `PoemGenre` export. `npm run knip`
    passes. Triage any unused-export finding (remove the export or use it) instead of re-adding an ignore.
- [ ] 6.4 (FR-1) Entry links: `POEM_MANAGEMENT_PATH` in `shared/config/account-paths.ts`;
  `AccountAuthorLinks` and `AuthorOwnerLinkView` render «Управление произведениями».
  - Verify with the authors tests for both components (implements FR-1 of add-poem-creation):
    public own profile shows it with `href="/account/poems"`; no profile, not public, other
    visitor don't.
  - Scaffold clean-up: remove the `@public` tag on `POEM_MANAGEMENT_PATH`.
- [ ] 6.5 (FR-1, FR-2, FR-3, FR-7, NFR-9) Verify: typecheck, lint, coverage, build (route list per NFR-9), knip.

## 7. Breadcrumbs <!-- isolated -->

- [ ] 7.1 (FR-8) Static rows for `/account/poems` and `/account/poems/new`; the `own-poem` match
  and `getOwnPoemTitle` from `@/features/poem-management` (design D10).
  - Verify with `src/features/breadcrumbs/tests/model/*.test.ts` (implements FR-8 of
    add-poem-creation): the three trails; not-found → no trail; unavailable → ends at
    «Управление произведениями» as current; `/account/poems/a/b` → no match.
- [ ] 7.2 (FR-8) Verify: typecheck, lint, coverage, build, knip; `app/tests/breadcrumbs-slot.test.ts`
  passes.

## 8. Docs and verification <!-- judgement-heavy -->

- [ ] 8.1 (NFR-3, FR-6) Update `docs/architecture.md` (new feature, routes, slot pages, moved shared modules,
  import rules) and `docs/state-management.md` (poems as a Supabase public read with one tag
  per author; the Contentful own-scope exception widened to fallback reads such as genres; the
  created-poem notice store; TanStack still unused, why; the "A write that expires a public tag" rule gains
  the row-counting variant). Record ADR 0009 with the `record-decision` skill: a reader-owned write
  that creates rows counts the caller's own rows inside the `security definer` function that writes
  them (design D2); it partially supersedes ADR 0007 (Decisions 1 and 3, and Decision 6's poem
  example), and ADR 0007's status line gains "Partially superseded by 0009".
- [ ] 8.2 (FR-9, FR-10) Update the recorded web-qa scenarios that relied on mock illustrations or genres
  (`author-poems-reading-path`, `poem-two-quick-clicks`, `author-page-sections`).
- [ ] 8.3 (NFR-3, NFR-6, NFR-2, NFR-8) Static checks: the NFR-3 import searches, the NFR-6 literal search,
  the NFR-2 `"use client"` search; record results in the group's commit body.
- [ ] 8.4 (NFR-9) `npm run build` with no Supabase or Contentful variables exits 0 and the route
  list matches NFR-9.
- [ ] 8.5 (NFR-1, FR-3) Add to `PROGRESS.md`'s deploy checklist: `npx supabase db push` for the poems migration,
  the `poem-illustrations` bucket with its limits on the hosted project, and the Contentful `tag`
  content type with its entries in each environment.
- [ ] 8.6 (FR-1, FR-2, FR-3, FR-4, FR-5, FR-7, FR-8, FR-13, NFR-7, NFR-8) Gate 3 (web-qa) over the change: create with and without an illustration, validation,
  the notification shown once, both paths to the poem, guest redirect, the trails; record the
  agreed flows as scenarios.
