# Tasks

Prerequisite: the local Supabase stack runs (`npx supabase start`), for groups 1 and 8. The scaffold (`opsx-scaffold`) lands before group 1 and creates the file map from design D1/D6 with stub bodies.

## 1. Database: table, RLS, bucket, policies <!-- judgement-heavy -->

- [x] 1.1 (FR-4, FR-5, FR-8, NFR-2) Add `supabase/migrations/<timestamp>_author_profiles.sql` per design D2.
  - Include:
    - the table with its checks: blank-pattern name and about checks (whitespace as JS `trim()` defines it), and the `photo_path` format pinned to `<id>/<uuid>.png|jpg`. No ordering index: the directory sorts in the DAL;
    - RLS enabled, with the four policies;
    - the column grants (anon without `user_id`; insert and update limited to the listed columns).
  - Add the `author-photos` bucket (public, 5242880 bytes, png/jpeg) and the `storage.objects` insert/select/delete policies scoped to a folder naming a profile the caller owns.
  - Put the documented down-migration SQL in the file's header comment.
  - Mirror the bucket in `supabase/config.toml` (`[storage.buckets.author-photos]`).
  - Verify `npx supabase db reset` applies the migration with no error.
- [x] 1.2 (FR-4, FR-5, NFR-2) Add pgTAP tests in `supabase/tests/author_profiles.test.sql` covering:
  - anon selects only rows with both names, and selecting `user_id` as anon is denied;
  - an authenticated user reads their own non-public row;
  - user B cannot insert a row for A, or update or read A's non-public row;
  - the owner cannot update `id`, `user_id`, or `created_at`;
  - `photo_path` outside the profile's folder is rejected, including a `<own id>/../<other id>/…` path and a non-uuid file name;
  - a real save runs through the grants: `insert … on conflict do nothing`, then `update … returning` with the explicit column list, as `authenticated`;
  - these values are rejected by checks:
    - an empty-string or whitespace-only name;
    - a 61-character name;
    - a 1001-character about;
    - `about_align = 'justify'`;
  - a second row for the same `user_id` violates the unique constraint;
  - Storage: user B cannot insert into, or delete from, `<A's profile id>/…` in `author-photos`.

  Verify `npx supabase test db` passes. Document the command in `docs/testing.md` (local-only, not in CI) and the migration workflow (`db reset` locally, `db push` at deploy) in `docs/environment.md`.

## 2. Session accessor and the public Supabase client <!-- judgement-heavy -->

- [ ] 2.1 (FR-1, FR-2, NFR-2) In `features/auth/dal/current-user.ts`, implement two functions per design D1, and export both from `features/auth/index.ts`:
  - `getCurrentUserId()`: `connection()` first; `getClaims()` → `sub` or `null`; never throws; logs by name only for non-config errors;
  - `requireUserId()`: redirects to `/login` when `null`, with the redirect outside any `try`.

  Re-implement `isSignedIn()` on top of `getCurrentUserId()`. Verify with `tests/dal/current-user.test.ts`: claims → id; error, no claims, or throw → `null`; config error not logged; `requireUserId` calls `redirect("/login")` for `null`. The existing `is-signed-in.test.ts` must still pass unchanged.
- [ ] 2.2 (FR-13, FR-14, NFR-3) Add `shared/lib/supabase/public.ts` (`import "server-only"`): `createSupabasePublicClient()`, a cookie-less client with `persistSession: false, autoRefreshToken: false` that throws `SupabaseConfigError` on bad config. Verify with `tests/public.test.ts` (mock `@supabase/supabase-js`): options passed, config error propagates, no `cookies()` call. Update `docs/architecture.md`'s `shared/lib/supabase` bullet with the new subpath and when to use it (inside `"use cache"` only).

- [ ] 2.3 (FR-9, NFR-3) Add `shared/lib/safe-action/create-action-client.ts` (`import "server-only"`): `createActionClient({ logPrefix, genericMessage })` with `handleServerError` (it logs `[<prefix>] action failed: <name>` and returns the generic message) and `defaultValidationErrorsShape: "flattened"` (design D1). Rebuild `features/auth/actions/action-client.ts` on it. Verify:
  - a factory test: name-only log, generic message, input never logged;
  - every existing auth action test passes unchanged.

## 3. Authors domain model <!-- isolated -->

- [ ] 3.1 (FR-8, NFR-5) Implement four modules:
  - `model/author.constants.ts`: `OWNER_PROFILE_COLUMNS` / `PUBLIC_AUTHOR_COLUMNS` (explicit lists, never `*`), `NAME_MAX_LENGTH = 60`, `ABOUT_MAX_LENGTH = 1000`, `PHOTO_MAX_BYTES = 5 * 1024 * 1024`, bucket name, photo display size, sizes string;
  - `model/author.types.ts`;
  - `model/author-profile.schema.ts`: name (trim, 1–60), about (trim, 1–1000 code points), align enum, photo (`File`, size), field enum, plus the row schema used by the DAL;
  - `model/author-messages.ts`: every string from the proposal's UI copy table, in Russian (NFR-8), verbatim.

  Verify with `tests/model/author-profile.schema.test.ts`: 60/61 and blank names, a 60-emoji name accepted (code points), trimming, 1000/1001 about counted in code points (an emoji case), Markdown syntax counted, invalid align, a 5 MiB / 5 MiB + 1 file.
- [ ] 3.2 (FR-4, FR-8, FR-9, FR-13) Implement seven pure functions:
  - `model/is-public-profile.ts`;
  - `model/has-profile-content.ts` (a row with every content field `NULL` counts as no profile, design D3);
  - `model/detect-image-type.ts` (PNG/JPEG magic bytes → `"png" | "jpeg" | null`);
  - `model/classify-profile-error.ts` (config → `unavailable`; expired or invalid JWT and HTTP 401 → `unauthenticated`; network, 5xx, and Storage 5xx → `unavailable`; everything else, including `42501`, → `unknown`);
  - `model/author-cache-tags.ts`;
  - `model/compare-authors.ts` (lower-cased last name, then first name, by code point, then `id`);
  - `model/validate-photo-file.ts` (size, then the first 12 bytes through `detectImageType` → `{ ok, type } | { ok: false, error: "too-large" | "unsupported-type" }`; it runs in the browser and the action, design D4).

  Verify with table-driven unit tests for each: a GIF header and a truncated buffer → `null`; a 5 MiB + 1 file → `too-large` without reading its bytes.
- [ ] 3.3 (FR-11) Implement `model/markdown-format.ts` `applyFormat(text, selection, format)` per design D7. Verify with unit tests:
  - each of the seven formats with a selection and with an empty selection (placeholder inserted and selected);
  - multi-line block prefixing;
  - the returned selection covers the formatted text.
- [ ] 3.4 (FR-7, FR-9) Implement `model/profile-form-state.ts`, which maps a next-safe-action result (validation errors / serverError / `failed` / `saved`) plus the submitted draft into a field form state. It mirrors `auth/model/form-state.ts`. Verify with table-driven tests: every branch, the draft kept on failure, and `serverError` → the generic message.

## 4. Authors data access and actions <!-- judgement-heavy -->

- [ ] 4.1 (FR-1, FR-2, FR-15) Implement `dal/my-author-profile.ts` `getMyAuthorProfile(userId)`: cookie client, select own row with `OWNER_PROFILE_COLUMNS`, Zod-parse, return `AuthorProfile | null` (`null` also for a row with no content) or a failure; never throws for an expected failure. Verify with `tests/dal/my-author-profile.test.ts` (mock the server client): row, no row, empty row → `null`, Supabase error, config error, malformed row, and the select string is the explicit column list.
- [ ] 4.2 (FR-13, FR-14, FR-17, NFR-7) Implement `dal/public-authors.ts` per design D5:
  - `listPublicAuthors()` (tag `authors`) and `getPublicAuthor(id)` (tag `author:<id>`), each with an inner `"use cache"`;
  - `cacheLife` chosen by result: `hours` for ok, `minutes` for not-found, `seconds` for unavailable (NFR-7);
  - failures returned as values, never thrown;
  - a UUID check before the cache scope;
  - photo URL built with `getPublicUrl`;
  - no `user_id` in the result.

  Verify with tests (`next/cache` is globally mocked):
  - sorted rows mapped; empty list;
  - non-UUID → `not-found` with no client call;
  - missing row → `not-found` with `cacheLife("minutes")`;
  - error → `unavailable` with `cacheLife("seconds")`, logged by name;
  - each read tagged with its own tag only.

  Add the "Supabase public reads" subsection to `docs/state-management.md` per design D12: the cookie-less client, the feature-DAL cache scope, result-dependent `cacheLife`, and `updateTag` from actions vs `revalidateTag` from webhooks.
- [ ] 4.3 (FR-5, FR-10, FR-12) Implement `dal/author-profile-writes.ts` per design D3/D4:
  - `writeOwnProfile(userId, patch)`: ensure the row exists (`upsert({ user_id }, { ignoreDuplicates: true })`), then `update(patch).eq("user_id", …).select(OWNER_PROFILE_COLUMNS).single()`; no upsert carries a value (design D3, Gate 1 N1);
  - `clearProfileField(userId, field)` (about also resets align; ends with `.maybeSingle()`, so a missing row → `saved` with no profile, design D3 N5);
  - `replacePhoto(userId, file, type)`:
    1. ensure the row exists (upsert `{ user_id }`, ignoring duplicates) and read `id` and `photo_path`;
    2. upload to `<id>/<uuid>.<ext>`;
    3. update `photo_path`;
    4. remove the old file.

    A failed step 3 triggers a compensating remove. A failed old-file removal is logged and still returns `ok`.
  - `removePhoto(userId)`: read the path, set `photo_path = null`, then remove the file best-effort; a row failure leaves the file untouched (design D3, Gate 1 C4).

  Verify with tests for each path, including the compensation and best-effort branches, and that no log line contains the input.
- [ ] 4.4 (FR-7, FR-8, FR-9, FR-10, FR-17, NFR-2, NFR-3) Implement `actions/action-client.ts` (`authorsActionClient = createActionClient({ logPrefix: "authors", … })`) and `actions/author-profile.actions.ts` with `saveNameAction`, `saveAboutAction`, `savePhotoAction` (`validatePhotoFile` repeated on the server), and `deleteProfileFieldAction`. Each resolves the user via `getCurrentUserId()`, never from input. On success it calls `updateTag(AUTHORS_TAG)` and `updateTag(authorTag(id))`. Verify with `tests/actions/author-profile.actions.test.ts`:
  - validation → no DAL call;
  - `null` user → `unauthenticated` with no DAL call;
  - a DAL failure passed through;
  - success → both tags updated;
  - a GIF disguised as PNG → field error with no upload;
  - a thrown error → generic `serverError` with only the name logged.

## 5. Public pages: directory and author page <!-- judgement-heavy -->

- [ ] 5.1 (NFR-4) The user installs `react-markdown`: package installs are blocked for the agent by `permissions.deny`, so the user runs `! npm install react-markdown`. Verify `package.json` `dependencies` gain exactly `react-markdown` vs `main` and `npm run deps:audit` passes.
- [ ] 5.2 (FR-16, NFR-6) Update `next.config.ts` per design D4/D8:
  - `experimental.serverActions.bodySizeLimit: "6mb"` with a comment on why;
  - `images.remotePatterns` derived from `NEXT_PUBLIC_SUPABASE_URL` when set, with the derivation as a small pure helper under `src/shared/config/` with tests.

  Verify `npm run build` with no Supabase env exits 0. Document the build-time dependency on `NEXT_PUBLIC_SUPABASE_URL` in `docs/environment.md`.
- [ ] 5.3 (FR-14, NFR-1) Implement `components/AuthorAbout`: `react-markdown` with `skipHtml`, the allowlist, `unwrapDisallowed`, and an alignment utility. Verify with component tests:
  - `## Poet` → h2;
  - `<script>` → no script element;
  - a link → text with no `a`;
  - an image → alt text only, with no `img`;
  - center alignment class applied.
- [ ] 5.4 (FR-14, FR-16, NFR-5) Implement `components/AuthorPhoto` plus `AuthorPhoto.module.css`:
  - `next/image` 300 × 400 with `sizes`;
  - `unoptimized` for local hosts, decided by a pure helper;
  - a placeholder user icon (`aria-hidden`);
  - a 460 px media query.

  Verify with tests: alt "Фото: <name>", placeholder without an `img`, `unoptimized` only for localhost/127.0.0.1. Add `AuthorPhoto` to `docs/design-system.md` as a feature-local primitive.
- [ ] 5.5 (FR-13, NFR-8) Implement `components/AuthorDirectory` (Suspense wrapper, awaiting `listPublicAuthors`) and the presentational `AuthorList`, and add `app/(public)/authors/page.tsx`. Verify `AuthorList` tests:
  - the heading "Наши авторы";
  - link labels and hrefs in order;
  - "Пока нет авторов." and "Список авторов сейчас недоступен.";
  - the root element has `lang="ru"`.
- [ ] 5.6 (FR-14, FR-15, FR-18, NFR-8) Implement `components/AuthorPage` (Suspense; `notFound()` on not-found, a soft 404; throws on unavailable), the presentational `AuthorProfileView`, and `AuthorOwnerLink` (its own Suspense; `getCurrentUserId` + `getMyAuthorProfile(userId)`; renders only on a match, and nothing on a failed read). Add `app/(public)/authors/[id]/page.tsx`. Verify with tests:
  - the view renders the h1, the photo or placeholder, and about, or omits about when empty;
  - its root element has `lang="ru"`;
  - `AuthorOwnerLinkView` shows "Редактировать профиль" only when `isOwner`, placed before the h1.

## 6. Account page and header <!-- judgement-heavy -->

- [ ] 6.1 (FR-1, FR-2, FR-18, NFR-8) Implement `components/AccountAuthorSection` (Suspense → `requireUserId` → `getMyAuthorProfile(userId)` → the presentational `AccountAuthorLinks`, or a danger `Alert` on a failed read) and add `app/(authorized)/account/page.tsx`. Update `(authorized)/layout.tsx`'s comment per design D9. Update `docs/architecture.md` (design D12):
  - the `(authorized)` bullet ("each page calls `requireUserId()`");
  - the project tree gains `features/authors`, `shared/lib/safe-action`, `shared/lib/supabase/public.ts`, and the `(authorized)/account` routes;
  - the rule that a feature may import another feature's public API for server-only accessors (authors → auth).

  Verify `AccountAuthorLinks` tests for the three FR-1 states (including an emptied row → "Создать кабинет автора"), the FR-18 alert, and `lang="ru"` on the root. Verify `docs/architecture.md` matches the files on disk.
- [ ] 6.2 (FR-3, NFR-8) Add the header `<nav>` with "Наши авторы" (`lang="ru"`) in `app/layout.tsx`, and a "Личный кабинет" link (`lang="ru"`) in `AuthStatus`'s signed-in branch. Verify the updated `AuthStatus` tests (signed in: «Личный кабинет» + Sign out; signed out: Sign in only) and the auth FR-7 scenarios.

## 7. Author editor <!-- judgement-heavy -->

- [ ] 7.1 (NFR-4, NFR-5) Promote `features/auth/components/AuthField` to `shared/ui/TextField`. A second feature now needs a labelled input with an error (`docs/architecture.md`, "move to `shared/` when a second feature needs it"; ui-plan reuse note).
  - **`TextField`**: `src/shared/ui/TextField/TextField.tsx` + `TextField.types.ts`, exported from `src/shared/ui/index.ts`.
    - Props: `label`, optional `error`, and the input's own props (`ComponentPropsWithoutRef<"input">` minus `id`, `className`, `aria-invalid`, `aria-describedby`), so it works both uncontrolled (auth forms) and controlled (the editor's draft).
    - Same markup, classes, `useId` wiring, and token-only styling as `AuthField` today.
  - **Auth:** `SignInForm` and `SignUpForm` switch to `TextField` with their current props. Delete `AuthField/` (no other consumer).
  - **Docs:** `docs/design-system.md` moves the row from feature-local `AuthField` to the shared primitive `TextField`.

  Verify:
  - `src/shared/ui/tests/TextField.test.tsx`: label association; `aria-invalid` and `aria-describedby` only with an error; the error text rendered; a controlled `value`/`onChange` works;
  - every existing `SignInForm`/`SignUpForm` test passes unchanged;
  - `npm run knip` reports no leftover `AuthField` export.
- [ ] 7.2 (FR-6, FR-7, FR-9, FR-10, NFR-5, NFR-8) Implement:
  - `AuthorProfileEditor`:
    - `editingField` (plain `useState`) and `activeField` via `useOptimistic<ProfileField | null>(null)`, with `disabled = (editingField ?? activeField) !== null && (editingField ?? activeField) !== field` (design D6);
    - the optimistic `SaveNotice`;
    - "Открыть публичную страницу" first in the main content when public;
    - a `lang="ru"` root;
  - `NameFieldEditor` (its input is the shared `TextField` from 7.1):
    - `useActionState` + `useOptimistic`, with the wrapper per design D6, including the `catch` that maps a rejected call to `unknown`;
    - input-only edit mode, and view mode with "Сохранение…" while pending;
    - Изменить/Сохранить/Отмена/Удалить, with "Удаление…" while a delete is pending;
    - the error under the field with `aria-describedby` / `aria-invalid`;
  - `FieldErrorText`.

  Verify with component tests (mock the actions with controllable promises) against:
  - the FR-7 pending/success/failure scenarios (pending shows text and a disabled "Сохранение…" with no input; failure returns to the input with the draft);
  - other fields disabled while a field is merely in edit mode, and enabled again after Отмена or success;
  - other fields disabled *while* the promise is unresolved, not only after;
  - two consecutive successful saves: the status region empties while each is pending and reads "Сохранено" after each;
  - delete pending shows the empty state with "Удаление…", and a failed delete restores the value;
  - a rejected action promise → the generic error under the field, with no error boundary;
  - `lang="ru"` on the root.
- [ ] 7.3 (FR-8, FR-10, FR-11) Implement `AboutFieldEditor`: toolbar buttons with Russian accessible names, the alignment control, «Редактор»/«Просмотр» using `AuthorAbout`, and an "N / 1000" counter (code points after trimming, danger colour over 1000, no input cap). Verify with tests:
  - «Жирный» applied to the selection;
  - «Просмотр» renders the h2;
  - the counter updates, reads "1012 / 1000" after a long paste with all text kept, and reads "2 / 1000" for "  hi  ";
  - a save sends `{ about, align }`;
  - Удалить resets the shown alignment.
- [ ] 7.4 (FR-6, FR-8, FR-10, FR-12) Implement `PhotoFieldEditor`:
  - a file input that accepts `image/png,image/jpeg`;
  - `validatePhotoFile` run on change and before submit, which shows the field error and does not call the action on failure;
  - an optimistic object-URL preview, revoked after settle;
  - `AuthorPhoto`'s placeholder plus "Добавить фото" when empty, including right after a delete;
  - errors under the field.

  Verify with tests:
  - a 6 MB file and a GIF renamed `.png` → field error with the action not called;
  - a pending preview shown;
  - a failed save reverts to the previous photo (or the placeholder) with the error;
  - Удалить shows the placeholder and "Добавить фото";
  - a failed delete shows the previous photo again.
- [ ] 7.5 (FR-2, FR-18) Implement `components/AuthorEditorPanel` (Suspense → `requireUserId` → `getMyAuthorProfile(userId)` → `AuthorProfileEditor`, or the FR-18 danger `Alert` on a failed read) and add `app/(authorized)/account/author/page.tsx`. Verify `npm run typecheck && npm run lint` and that the editor renders in `npm run dev` for a signed-in user.
- [ ] 7.6 (FR-7, FR-17, NFR-2) Document the editor and record the decision:
  - add the about-editor toolbar and `SaveNotice` to `docs/design-system.md` as feature-local primitives;
  - record ADR `docs/decisions/0005-reader-owned-data-rls-and-per-field-actions.md` via `record-decision`, covering:
    - RLS plus column grants as the last line of defense;
    - per-field actions with `updateTag`;
    - cookie-less cached public reads with result-dependent lifetimes;
    - photo upload through a Server Action with a browser pre-check.

  Verify the ADR exists and is linked from `docs/decisions/`.

## 8. Integration verification <!-- judgement-heavy -->

- [ ] 8.1 (NFR-4, NFR-6) Run `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`, all green. The build route table lists `/authors` and `/authors/[id]` as partially prerendered and `/account` and `/account/author` per request. With no Supabase env, the build still exits 0. Grep new components for color literals (none) and `src/` for `SUPABASE_SERVICE_ROLE|SUPABASE_SECRET` (none).
- [ ] 8.2 (FR-4, FR-5, NFR-2) Manually validate against the local Supabase stack with two test users:
  - A creates a first name only → not on `/authors`; adds a last name → listed;
  - B cannot see A's non-public row via the REST API with B's token;
  - B cannot upload into, or delete from, A's folder;
  - A cannot `PATCH` their own `photo_path` to point into B's folder, or `PATCH` `user_id`;
  - an anonymous REST call selecting `user_id` is denied;
  - deleting A's last name → `/authors/<id>` shows the 404 page.

  Record the results in the group's commit body.
- [ ] 8.3 (FR-1–FR-18, NFR-5, NFR-8) Gate 3 web-qa over the full change. Flows:
  - signed-out `/account` → `/login`;
  - create the profile field by field, with pending, disabled, and "Сохранено";
  - only one field in edit mode at a time;
  - a validation error under the field, in Russian;
  - photo: a 6 MB file and a GIF rejected before any request (network tab); upload, replace, and delete, with the placeholder after delete in the editor and on the public page;
  - about with the toolbar, alignment, and preview;
  - the public page at 1024 px and 390 px widths;
  - the owner sees "Редактировать профиль" and another user doesn't;
  - an edit is reflected on `/authors` immediately;
  - header links for signed-in and signed-out visitors;
  - `lang="ru"` on the feature's content.
- [ ] 8.4 (FR-5, NFR-6) Add the deploy steps to `PROGRESS.md`'s deploy checklist: `npx supabase db push`, verify the bucket's limits, and `NEXT_PUBLIC_SUPABASE_URL` set at build time. Verify the lines exist.
