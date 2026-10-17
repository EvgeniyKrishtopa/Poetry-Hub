# Tasks

Prerequisite: the local Supabase stack runs (`npx supabase start`), for groups 1, 9, and 10. The scaffold (`opsx-scaffold`) lands before group 1 and creates the file map from design D1/D6 with stub bodies.

## 1. Database: table, RLS, bucket, policies <!-- judgement-heavy -->

- [x] 1.1 (FR-4, FR-5, FR-8, NFR-2) Add `supabase/migrations/<timestamp>_author_profiles.sql` per design D2.
  - Include:
    - the table with its checks: blank-pattern name and about checks (whitespace as JS `trim()` defines it), and the `photo_path` format pinned to `<id>/<uuid>.png|jpg`. No ordering index: the directory sorts in the DAL;
    - RLS enabled, with the select (public, owner) and update policies; no insert or delete policy;
    - the column grants (no client role selects or writes `user_id`; no insert grant; update limited to the content columns);
    - the security definer functions `ensure_my_author_profile()`, `my_author_profile_id()`, `owns_author_profile(folder)` (code-review CR-01).
  - Add the `author-photos` bucket (public, 5242880 bytes, png/jpeg) and the `storage.objects` insert/select/delete policies scoped to a folder naming a profile the caller owns; uploads pinned to `<uuid>/<uuid>.png|jpg`.
  - Put the documented down-migration SQL in the file's header comment.
  - Mirror the bucket in `supabase/config.toml` (`[storage.buckets.author-photos]`).
  - Verify `npx supabase db reset` applies the migration with no error.
- [x] 1.2 (FR-4, FR-5, NFR-2) Add pgTAP tests in `supabase/tests/author_profiles.test.sql` covering:
  - anon selects only rows with both names, and selecting `user_id` as anon or as a signed-in user is denied;
  - the three functions: own id, null without a profile, idempotent create, anon denied;
  - an authenticated user reads their own non-public row;
  - user B cannot insert a row for A, or update or read A's non-public row;
  - the owner cannot update `id`, `user_id`, or `created_at`;
  - `photo_path` outside the profile's folder is rejected, including a `<own id>/../<other id>/…` path and a non-uuid file name;
  - a real save runs through the grants: `ensure_my_author_profile()`, then `update … where id … returning` with the explicit column list, as `authenticated`;
  - these values are rejected by checks:
    - an empty-string or whitespace-only name;
    - a 61-character name;
    - a 1001-character about;
    - `about_align = 'justify'`;
  - a direct insert is denied, so one row per user comes from `ensure_my_author_profile()` (plus the `unique (user_id)` constraint);
  - Storage: user B cannot insert into, or delete from, `<A's profile id>/…` in `author-photos`.

  Verify `npx supabase test db` passes. Document the command in `docs/testing.md` (local-only, not in CI) and the migration workflow (`db reset` locally, `db push` at deploy) in `docs/environment.md`.

## 2. Session accessor and the public Supabase client <!-- judgement-heavy -->

- [x] 2.1 (FR-1, FR-2, NFR-2) In `features/auth/dal/current-user.ts`, implement two functions per design D1, and export both from `features/auth/index.ts`:
  - `getCurrentUserId()`: `connection()` first; `getClaims()` → `sub` or `null`; never throws; logs by name only for non-config errors;
  - `requireUserId()`: redirects to `/login` when `null`, with the redirect outside any `try`.

  Re-implement `isSignedIn()` on top of `getCurrentUserId()`. Verify with `tests/dal/current-user.test.ts`: claims → id; error, no claims, or throw → `null`; config error not logged; `requireUserId` calls `redirect("/login")` for `null`. The existing `is-signed-in.test.ts` must still pass unchanged.
- [x] 2.2 (FR-13, FR-14, NFR-3) Add `shared/lib/supabase/public.ts` (`import "server-only"`): `createSupabasePublicClient()`, a cookie-less client with `persistSession: false, autoRefreshToken: false` that throws `SupabaseConfigError` on bad config. Verify with `tests/public.test.ts` (mock `@supabase/supabase-js`): options passed, config error propagates, no `cookies()` call. Update `docs/architecture.md`'s `shared/lib/supabase` bullet with the new subpath and when to use it (inside `"use cache"` only).

- [x] 2.3 (FR-9, NFR-3) Add `shared/lib/safe-action/create-action-client.ts` (`import "server-only"`): `createActionClient({ logPrefix, genericMessage })` with `handleServerError` (it logs `[<prefix>] action failed: <name>` and returns the generic message) and `defaultValidationErrorsShape: "flattened"` (design D1). Rebuild `features/auth/actions/action-client.ts` on it. Verify:
  - a factory test: name-only log, generic message, input never logged;
  - every existing auth action test passes unchanged.

## 3. Authors domain model <!-- isolated -->

- [x] 3.1 (FR-8, NFR-5) Implement four modules:
  - `model/author.constants.ts`: `OWNER_PROFILE_COLUMNS` / `PUBLIC_AUTHOR_COLUMNS` (explicit lists, never `*`), `NAME_MAX_LENGTH = 60`, `ABOUT_MAX_LENGTH = 1000`, `PHOTO_MAX_BYTES = 5 * 1024 * 1024`, bucket name, photo display size, sizes string;
  - `model/author.types.ts`;
  - `model/author-profile.schema.ts`: name (trim, 1–60), about (trim, 1–1000 code points), align enum, photo (`File`, size), field enum, plus the row schema used by the DAL;
  - `model/author-messages.ts`: every string from the proposal's UI copy table, in Russian (NFR-8), verbatim.

  Verify with `tests/model/author-profile.schema.test.ts`: 60/61 and blank names, a 60-emoji name accepted (code points), trimming, 1000/1001 about counted in code points (an emoji case), Markdown syntax counted, invalid align, a 5 MiB / 5 MiB + 1 file.
- [x] 3.2 (FR-4, FR-8, FR-9, FR-13) Implement seven pure functions:
  - `model/is-public-profile.ts`;
  - `model/has-profile-content.ts` (a row with every content field `NULL` counts as no profile, design D3);
  - `model/detect-image-type.ts` (PNG/JPEG magic bytes → `"png" | "jpeg" | null`);
  - `model/classify-profile-error.ts` (config → `unavailable`; expired or invalid JWT and HTTP 401 → `unauthenticated`; network, 5xx, and Storage 5xx → `unavailable`; everything else, including `42501`, → `unknown`);
  - `model/author-cache-tags.ts`;
  - `model/compare-authors.ts` (lower-cased last name, then first name, by code point, then `id`);
  - `model/validate-photo-file.ts` (size, then the first 12 bytes through `detectImageType` → `{ ok, type } | { ok: false, error: "too-large" | "unsupported-type" }`; it runs in the browser and the action, design D4).

  Verify with table-driven unit tests for each: a GIF header and a truncated buffer → `null`; a 5 MiB + 1 file → `too-large` without reading its bytes.
- [x] 3.3 (FR-11) Implement `model/markdown-format.ts` `applyFormat(text, selection, format)` per design D7. Verify with unit tests:
  - each of the seven formats with a selection and with an empty selection (placeholder inserted and selected);
  - multi-line block prefixing;
  - the returned selection covers the formatted text.
- [x] 3.4 (FR-7, FR-9) Implement `model/profile-form-state.ts`, which maps a next-safe-action result (validation errors / serverError / `failed` / `saved`) plus the submitted draft into a field form state. It mirrors `auth/model/form-state.ts`. Verify with table-driven tests: every branch, the draft kept on failure, and `serverError` → the generic message.

## 4. Authors data access and actions <!-- judgement-heavy -->

- [x] 4.1 (FR-1, FR-2, FR-15) Implement `dal/my-author-profile.ts` `getMyAuthorProfile()`: cookie client, `rpc("my_author_profile_id")` (`null` → no profile), then select that row by `id` with `OWNER_PROFILE_COLUMNS` (design D3, CR-01), Zod-parse, return `AuthorProfile | null` (`null` also for a row with no content) or a failure; never throws for an expected failure. Verify with `tests/dal/my-author-profile.test.ts` (mock the server client): row, no row, empty row → `null`, Supabase error, config error, malformed row, and the select string is the explicit column list.
- [x] 4.2 (FR-13, FR-14, FR-17, NFR-7) Implement `dal/public-authors.ts` per design D5:
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
- [x] 4.3 (FR-5, FR-10, FR-12) Implement `dal/author-profile-writes.ts` per design D3/D4:
  - `writeOwnProfile(patch)`: `rpc("ensure_my_author_profile")` → id, then `update(patch).eq("id", id).select(OWNER_PROFILE_COLUMNS).single()`; the client never sends `user_id` (design D3, Gate 1 N1, CR-01);
  - `clearProfileField(field)`: `rpc("my_author_profile_id")`, `null` → `saved` with no profile; otherwise update by id (about also resets align; ends with `.maybeSingle()`, design D3 N5);
  - `replacePhoto(file, type)`:
    1. `rpc("ensure_my_author_profile")` → id, and read that row's `photo_path`;
    2. upload to `<id>/<uuid>.<ext>`;
    3. update `photo_path`;
    4. remove the old file.

    A failed step 3 triggers a compensating remove. A failed old-file removal is logged and still returns `ok`.
  - `removePhoto()`: find the own id with `rpc("my_author_profile_id")`, read the path, set `photo_path = null`, then remove the file best-effort; a row failure leaves the file untouched (design D3, Gate 1 C4).

  Verify with tests for each path, including the compensation and best-effort branches, and that no log line contains the input.
- [x] 4.4 (FR-7, FR-8, FR-9, FR-10, FR-17, NFR-2, NFR-3) Implement `actions/action-client.ts` (`authorsActionClient = createActionClient({ logPrefix: "authors", … })`) and `actions/author-profile.actions.ts` with `saveNameAction`, `saveAboutAction`, `savePhotoAction` (`validatePhotoFile` repeated on the server), and `deleteProfileFieldAction`. Each resolves the user via `getCurrentUserId()`, never from input. On success it calls `updateTag(AUTHORS_TAG)` and `updateTag(authorTag(id))`. Verify with `tests/actions/author-profile.actions.test.ts`:
  - validation → no DAL call;
  - `null` user → `unauthenticated` with no DAL call;
  - a DAL failure passed through;
  - success → both tags updated;
  - a GIF disguised as PNG → field error with no upload;
  - a thrown error → generic `serverError` with only the name logged.

## 5. Public pages: directory and author page <!-- judgement-heavy -->

- [x] 5.1 (NFR-4) The user installs `react-markdown`: package installs are blocked for the agent by `permissions.deny`, so the user runs `! npm install react-markdown`. Verify `package.json` `dependencies` gain exactly `react-markdown` vs `main` and `npm run deps:audit` passes.
- [x] 5.2 (FR-16, NFR-6) Update `next.config.ts` per design D4/D8:
  - `experimental.serverActions.bodySizeLimit: "6mb"` with a comment on why;
  - `images.remotePatterns` derived from `NEXT_PUBLIC_SUPABASE_URL` when set, with the derivation as a small pure helper under `src/shared/config/` with tests.

  Verify `npm run build` with no Supabase env exits 0. Document the build-time dependency on `NEXT_PUBLIC_SUPABASE_URL` in `docs/environment.md`.
- [x] 5.3 (FR-14, NFR-1) Implement `components/AuthorAbout`: `react-markdown` with `skipHtml`, the allowlist, `unwrapDisallowed`, and an alignment utility. Verify with component tests:
  - `## Poet` → h2;
  - `<script>` → no script element;
  - a link → text with no `a`;
  - an image → alt text only, with no `img`;
  - center alignment class applied.
- [x] 5.4 (FR-14, FR-16, NFR-5) Implement `components/AuthorPhoto` plus `AuthorPhoto.module.css`:
  - `next/image` 300 × 400 with `sizes`;
  - `unoptimized` for local hosts, decided by a pure helper;
  - a placeholder user icon (`aria-hidden`);
  - a 460 px media query.

  Verify with tests: alt "Фото: <name>", placeholder without an `img`, `unoptimized` only for localhost/127.0.0.1. Add `AuthorPhoto` to `docs/design-system.md` as a feature-local primitive.
- [x] 5.5 (FR-13, NFR-8) Implement `components/AuthorDirectory` (Suspense wrapper, awaiting `listPublicAuthors`) and the presentational `AuthorList`, and add `app/(public)/authors/page.tsx`. Verify `AuthorList` tests:
  - the heading "Наши авторы";
  - link labels and hrefs in order;
  - "Пока нет авторов." and "Список авторов сейчас недоступен.";
  - the root element has `lang="ru"`.
- [x] 5.6 (FR-14, FR-15, FR-18, NFR-8) Implement `components/AuthorPage` (Suspense; `notFound()` on not-found, a soft 404; throws on unavailable), the presentational `AuthorProfileView`, and `AuthorOwnerLink` (its own Suspense; `getCurrentUserId` + `getMyAuthorProfile()`; renders only on a match, and nothing on a failed read). Add `app/(public)/authors/[id]/page.tsx`. Verify with tests:
  - the view renders the h1, the photo or placeholder, and about, or omits about when empty;
  - its root element has `lang="ru"`;
  - `AuthorOwnerLinkView` shows "Редактировать профиль" only when `isOwner`, placed before the h1.

## 6. Account page and header <!-- judgement-heavy -->

- [x] 6.1 (FR-1, FR-2, FR-18, NFR-8) Implement `components/AccountPage` (Suspense → `AccountAuthorSection`: `requireUserId` → `getMyAuthorProfile()` → the presentational `AccountAuthorLinks`, or a danger `Alert` on a failed read) and add `app/(authorized)/account/page.tsx`. Update `(authorized)/layout.tsx`'s comment per design D9. Update `docs/architecture.md` (design D12):
  - the `(authorized)` bullet ("each page calls `requireUserId()`");
  - the project tree gains `features/authors`, `shared/lib/safe-action`, `shared/lib/supabase/public.ts`, and the `(authorized)/account` routes;
  - the rule that a feature may import another feature's public API for server-only accessors (authors → auth).

  Verify `AccountAuthorLinks` tests for the three FR-1 states (including an emptied row → "Создать кабинет автора"), the FR-18 alert, and `lang="ru"` on the root. Verify `docs/architecture.md` matches the files on disk.
- [x] 6.2 (FR-3, NFR-8) Add the header `<nav>` with "Наши авторы" (`lang="ru"`) in `app/layout.tsx`, and a "Мастерская поэта" link (`lang="ru"`, its own `AccountLink` component; was «Личный кабинет» until the PR #80 review) in `AuthStatus`'s signed-in branch. Verify the updated `AuthStatus` tests (signed in: «Мастерская поэта» + Sign out; signed out: Sign in only) and the auth FR-7 scenarios.

## 7. Author editor <!-- judgement-heavy -->

- [x] 7.1 (NFR-4, NFR-5) Promote `features/auth/components/AuthField` to `shared/ui/TextField`. A second feature now needs a labelled input with an error (`docs/architecture.md`, "move to `shared/` when a second feature needs it"; ui-plan reuse note).
  - **`TextField`**: `src/shared/ui/TextField/TextField.tsx` + `TextField.types.ts`, exported from `src/shared/ui/index.ts`.
    - Props: `label`, optional `error`, and the input's own props (`ComponentPropsWithoutRef<"input">` minus `id`, `className`, `aria-invalid`, `aria-describedby`), so it works both uncontrolled (auth forms) and controlled (the editor's draft).
    - Same markup, classes, `useId` wiring, and token-only styling as `AuthField` today.
  - **Auth:** `SignInForm` and `SignUpForm` switch to `TextField` with their current props. Delete `AuthField/` (no other consumer).
  - **Docs:** `docs/design-system.md` moves the row from feature-local `AuthField` to the shared primitive `TextField`.

  Verify:
  - `src/shared/ui/tests/TextField.test.tsx`: label association; `aria-invalid` and `aria-describedby` only with an error; the error text rendered; a controlled `value`/`onChange` works;
  - every existing `SignInForm`/`SignUpForm` test passes unchanged;
  - `npm run knip` reports no leftover `AuthField` export.
- [x] 7.2 (FR-6, FR-7, FR-9, FR-10, NFR-5, NFR-8) Implement:
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
- [x] 7.3 (FR-8, FR-10, FR-11) Implement `AboutFieldEditor`: toolbar buttons with Russian accessible names, the alignment control, «Редактор»/«Просмотр» using `AuthorAbout`, and an "N / 1000" counter (code points after trimming, danger colour over 1000, no input cap). Verify with tests:
  - «Жирный» applied to the selection;
  - «Просмотр» renders the h2;
  - the counter updates, reads "1012 / 1000" after a long paste with all text kept, and reads "2 / 1000" for "  hi  ";
  - a save sends `{ about, align }`;
  - Удалить resets the shown alignment.
- [x] 7.4 (FR-6, FR-8, FR-10, FR-12) Implement `PhotoFieldEditor`:
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
- [x] 7.5 (FR-2, FR-18) Implement `components/AuthorEditorPanel` (Suspense → `requireUserId` → `getMyAuthorProfile()` → `AuthorProfileEditor`, or the FR-18 danger `Alert` on a failed read) and add `app/(authorized)/account/author/page.tsx`. Verify `npm run typecheck && npm run lint` and that the editor renders in `npm run dev` for a signed-in user.
- [x] 7.6 (FR-7, FR-17, NFR-2) Document the editor and record the decision:
  - add the about-editor toolbar and `SaveNotice` to `docs/design-system.md` as feature-local primitives;
  - record ADR `docs/decisions/0005-reader-owned-data-rls-and-per-field-actions.md` via `record-decision`, covering:
    - RLS plus column grants as the last line of defense;
    - per-field actions with `updateTag`;
    - cookie-less cached public reads with result-dependent lifetimes;
    - photo upload through a Server Action with a browser pre-check.

  Verify the ADR exists and is linked from `docs/decisions/`.

## 8. Proxy redirect and session-unavailable state <!-- judgement-heavy -->

Added 2026-10-16 (user decision, PR #81 discussion): FR-19, design D9.

- [x] 8.1 (FR-19) One reading of a `getClaims()` result (design D9):
  - add the pure helper `shared/lib/supabase/claims.ts` `readClaimsState(result)` → `{ state: "signed-in", userId } | { state: "signed-out" } | { state: "unknown" }`. Rules in order, first match wins: a returned retryable error (`isAuthRetryableFetchError`, status ≥ 500, or a 429) → unknown, even with claims; any other returned error → signed-out, even with claims; a non-empty string `sub` → signed-in; anything else (no claims, claims without a valid `sub`) → signed-out. Name the states as an `as const` object (no magic strings);
  - in `shared/lib/supabase/session.ts`, make `refreshSession(request)` return `{ response, session }`, with `session` from `readClaimsState`, or unknown for a missing config or a thrown `getClaims`;
  - rebuild auth's `getCurrentUserId()` on `readClaimsState`: signed-in → its id, anything else → `null`, logging unchanged.

  Verify:
  - table tests for `readClaimsState`, in `shared/lib/supabase/tests/claims.test.ts`;
  - `session.test.ts`: each of the three states with `getClaims` called exactly once, and every existing session test still passes;
  - every existing `current-user.test.ts` and `is-signed-in.test.ts` test still passes unchanged, plus a case where a retryable error → `null`.
- [x] 8.2 (FR-19) Add `shared/config/account-paths.ts`: the pure helper `isAccountPath(pathname)` (`/account`, `/account/`, anything under `/account/`; not `/accounts`) and the `ACCOUNT_PATH` and `SIGN_IN_PATH` constants. Auth's `ACCOUNT_PATH` (`model/auth.constants.ts`) and `SIGN_IN_PATH` (`dal/current-user.ts`) are replaced by imports of these. Verify with table tests in `shared/config/tests/`; existing auth tests pass unchanged.
- [x] 8.3 (FR-19, NFR-2) In `src/proxy.ts`, redirect when every one holds: `isAccountPath`, method GET or HEAD, no `Next-Action` header, `session === "signed-out"`. The redirect is a 307 to `/login` (no query string) carrying every `Set-Cookie` from the refresh response, then the security headers and `Cache-Control: private, no-store`. Everything else returns the refresh response with the security headers, as today. Pages keep `requireUserId()` and actions keep `getCurrentUserId()` unchanged. Verify with `src/tests/proxy.test.ts`:
  - a signed-out GET for `/account/author` → 307 whose `Location` parses to the request's origin, path `/login`, no query; headers; no-store;
  - a revoked session's cleared cookies are on the redirect;
  - a POST with `Next-Action` while signed out → passes through, no redirect;
  - signed-in and unknown → pass through;
  - `/authors` and `/accounts` while signed out → pass through;
  - every existing proxy test still passes.
- [x] 8.4 (FR-20) Auth side of "can't tell" (design D9):
  - add `getSessionState()` to `features/auth/dal/current-user.ts` as the base function: `await connection()` first, outside any `try`; then the cookie client and `readClaimsState`; `unknown` for a missing config or a throw; logging by name as today. Export it from `@/features/auth`. `getCurrentUserId()` delegates: `signed-in ? userId : null`;
  - replace `requireUserId()` with `requireSession(): Promise<Exclude<ClaimsState, { state: "signed-out" }>>`, still redirecting on `signed-out` outside any `try`;
  - the header: `HeaderAuthLinksContent` passes only `state` (`"signed-in" | "signed-out" | "unknown"`, never the user id) to `AuthStatus`, which renders the new `HeaderAuthPlaceholder` for `unknown`; the Suspense fallback uses the same component; remove `isSignedIn()`.

  Verify:
  - `current-user.test.ts`: the three states, the redirect only on signed-out, and a missing config → `unknown` with `connection` awaited before the client is created;
  - `AuthStatus` tests: unknown → no "Sign in", "Sign out", or "Мастерская поэта";
  - every existing header and auth test passes, or is updated only where FR-7's "Session check fails" scenario was split.
- [x] 8.5 (FR-20, FR-9) Authors side:
  - add `components/SessionUnavailableAlert`: a server-rendered danger `Alert` with the copy-table text and `lang="ru"`, plus a client «Повторить» button (its own component) that calls `router.refresh()` inside `useTransition` and is disabled while pending;
  - `AccountAuthorSection` and `AuthorEditorLoader` call `requireSession()` and render it on `state: "unknown"`, with no profile read;
  - the profile actions map `getSessionState()` `unknown` → the `unavailable` failure, with no DAL call.

  Verify:
  - loader tests: unavailable → the alert and no `getMyAuthorProfile` call;
  - `SessionUnavailableAlert` test: the text; the button calls `refresh` and is disabled while the transition is pending;
  - actions test: unknown → `unavailable`, with no DAL call;
  - every existing test still passes.
- [x] 8.6 (FR-19, FR-20) Docs:
  - `docs/architecture.md`:
    - the `(authorized)` bullet notes the proxy's optimistic redirect for `/account` and that the page gate stays;
    - every `requireUserId()` mention (project tree, boundary rules, the cross-feature accessor rule) becomes `requireSession()` / `getSessionState()`;
  - the `src/app/(authorized)/layout.tsx` comment names `requireSession()`;
  - record ADR `docs/decisions/0006-proxy-redirect-and-session-states.md`, with `Supersedes: 0004 — only its first Decision bullet's boolean isSignedIn() and two-state AuthStatus; the rest stays in force`. The superseded part was replaced by FR-20's three-state read: the header and account pages say "can't tell" instead of "signed out", and only the state name, never the user id, reaches the header. The rest of ADR 0004 holds: the proxy is still the only token refresher, and "is the reader signed in?" for rendering stays auth's `dal/` question. The ADR says plainly that it narrows ADR 0004's rejected alternative ("put the check in `session.ts`") for routing only: the proxy routes on the result of the refresh it already runs, read by the same `readClaimsState` the DAL uses. It covers why the gate is optimistic, the Server Action exclusion, fail-open on an outage, and why a reader-triggered `router.refresh()` fits the retry when ADR 0004 rejected a client refresh after sign-out. One line notes that ADR 0005 point 2's `getCurrentUserId()` is now `getSessionState()` for actions, with the same principle (the user comes from the session, never from input);
  - mark ADR 0004's `## Status` with `Partially superseded by 0006` (the one edit the editing rule allows).

## 9. Per-user write limit <!-- judgement-heavy -->

Added 2026-10-17 (user decision): FR-21, design D13. Groups after 8 were renumbered: the integration verification group is now 10.

- [ ] 9.1 (FR-21, NFR-2) Add `supabase/migrations/<timestamp>_write_rate_limits.sql` per design D13 (`language sql`, the argument written `consume_write_allowance.scope`): the `write_rate_limits` table (RLS on, no policies, all privileges revoked from `anon` and `authenticated`) and the security definer `consume_write_allowance(scope text) returns boolean` (empty `search_path`, the caller from `auth.uid()` only, limits fixed inside it, one atomic upsert, an unknown scope raises; execute revoked from `public` and `anon`, granted to `authenticated`). Document the down migration in its header comment. Add pgTAP tests in `supabase/tests/write_rate_limits.test.sql`:
  - `profile_write`: calls 1–10 return true, the 11th false;
  - `photo_upload`: calls 1–5 return true, the 6th false;
  - the scopes are independent, and so are two users;
  - a window that started longer ago than its length (set `window_start` back as `postgres`) restarts: the next call returns true and `hits` is 1;
  - an unknown scope raises;
  - `authenticated` can't select, insert, update, or delete counter rows; `anon` can't execute the function.

  Verify `npx supabase db reset && npx supabase test db`: both test files pass.
- [ ] 9.2 (FR-21, NFR-8) Model: add `WRITE_SCOPES` (`as const`: `profileWrite: "profile_write"`, `photoUpload: "photo_upload"`) to `author.constants.ts`, `WriteFailure = ProfileFailure | "too-many-saves" | "too-many-uploads"` (used by `WriteAllowance`, `ProfileActionResult`, and `FieldFormState`; reads and `classifyProfileError` keep `ProfileFailure`, design D13), a `WriteAllowance` result type (`{ ok: true } | { ok: false; failure: WriteFailure }`), and the two FR-21 strings to `author-messages.ts` through `getProfileFailureMessage`. Verify the messages test: each new failure maps to its copy-table string; typecheck passes with reads still on `ProfileFailure`.
- [ ] 9.3 (FR-21, NFR-3) Implement `dal/write-allowance.ts` `consumeWriteAllowance(scope)` per design D13: the cookie client, `rpc("consume_write_allowance", { scope })`; exactly `true` → `{ ok: true }`; `false` → `too-many-saves` / `too-many-uploads` by scope; any other `data` with no error → `unknown`, logged; a Supabase error or `SupabaseConfigError` → `classifyProfileError`, logged by name only. Verify with `tests/dal/write-allowance.test.ts` (mock the server client): allowed, each scope over the limit, `null` and a non-boolean `data` → `unknown`, a 5xx error → `unavailable`, a 401 / JWT-expired error → `unauthenticated`, a `PGRST202` error → `unknown`, a config error → `unavailable`, the RPC name and argument.
- [ ] 9.4 (FR-21, FR-17, NFR-2) Wire the actions (design D13): `runOwnerWrite` takes a scope and consumes the allowance after `checkWriteAccess` and before `writeAndExpire`; the save and delete actions pass `profile_write`; `savePhotoAction` consumes `photo_upload` after the session check and before `validatePhotoFile`. Verify in `tests/actions/author-profile.actions.test.ts`:
  - over the limit, each action returns its failure with no DAL write and no `updateTag`;
  - the photo action over the limit never calls `validatePhotoFile`;
  - a photo that fails `validatePhotoFile` has already consumed its allowance (FR-21 "A photo with the wrong content counts");
  - a failed check → the allowance's failure (`unavailable` or `unknown`), no DAL write;
  - signed-out, unknown session, and invalid input → no allowance consumed;
  - every existing action test still passes, with the allowance mocked as allowed.
- [ ] 9.5 (FR-21) Docs:
  - record ADR `docs/decisions/0007-per-user-write-limits-in-postgres.md`: per-user limits on reader writes as a Postgres function that holds the limits, checked by the action after the session and before any write; why not Redis; per-IP protection left to the hosting; poems are expected to add their own scope;
  - `docs/state-management.md`'s "Supabase public reads" subsection: a write that expires a public cache tag goes through the write limit first.

## 10. Integration verification <!-- judgement-heavy -->

- [ ] 10.1 (NFR-4, NFR-6) Run `npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run knip`, all green. The build route table lists `/authors` and `/authors/[id]` as partially prerendered and `/account` and `/account/author` per request. With no Supabase env, the build still exits 0. Grep new components for color literals (none) and `src/` for `SUPABASE_SERVICE_ROLE|SUPABASE_SECRET` (none).
- [ ] 10.2 (FR-4, FR-5, NFR-2) Manually validate against the local Supabase stack with two test users:
  - A creates a first name only → not on `/authors`; adds a last name → listed;
  - B cannot see A's non-public row via the REST API with B's token;
  - B cannot upload into, or delete from, A's folder;
  - A cannot `PATCH` their own `photo_path` to point into B's folder, or `PATCH` `user_id`;
  - an anonymous REST call selecting `user_id` is denied;
  - deleting A's last name → `/authors/<id>` shows the 404 page;
  - with A's token, a REST read or write of `write_rate_limits` is denied, and an anonymous `rpc/consume_write_allowance` call is denied (FR-21).

  Record the results in the group's commit body.
- [ ] 10.3 (FR-1–FR-21, NFR-5, NFR-8) Gate 3 web-qa over the full change. Flows:
  - rate limit (FR-21): starting from a fresh counter (no profile write in the last minute), make 10 profile writes within a minute of the first; the 11th save shows «Слишком много сохранений. Попробуйте через минуту.» under the field with the draft kept, and `/authors` still shows the last saved value; once a minute has passed since the first of those writes, a save succeeds;
  - signed-out `/account` and `/account/author` → `/login` with no flash of the page (the network tab shows a 307 from the proxy, FR-19);
  - with the editor open, sign out in another tab, then save a field: the error «Сессия истекла. Войдите снова.» shows under the field, with no redirect (FR-19, FR-9);
  - signed in, stop only Supabase Auth (`docker stop supabase_auth_Poetry-Hub`) and restart the dev server, so it can't load Auth's signing keys (tokens are ES256: with keys already loaded, a valid token stays signed in, design Risks), then open `/account`: «Сервис временно недоступен. Попробуйте позже.» with «Повторить», no redirect, and the header shows neither "Sign in" nor "Sign out"; `docker start supabase_auth_Poetry-Hub`, click «Повторить»: the author section renders and the header shows «Мастерская поэта» and "Sign out" (FR-20; passed in group 8's dev check);
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
- [ ] 10.4 (FR-5, FR-21, NFR-6) Add the deploy steps to `PROGRESS.md`'s deploy checklist: `npx supabase db push` (both migrations: profiles and write limits), verify the bucket's limits, `NEXT_PUBLIC_SUPABASE_URL` set at build time, and per-IP rate rules at the hosting layer (Vercel Firewall or Cloudflare), including Server Action POSTs. Verify the lines exist.
