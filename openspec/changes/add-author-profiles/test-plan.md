# Test Plan: add-author-profiles

One row per acceptance criterion: each scenario in `specs/*/spec.md` and each headline criterion in `proposal.md`.

Levels:
- **unit**: one module or one component, with its collaborators mocked (model functions, DAL with a mocked Supabase client, actions with a mocked DAL, components with mocked actions).
- **integration**: crosses a real boundary: SQL against the local Supabase stack (pgTAP), or a full build or command run.
- **end-to-end**: a real browser against the running app (Gate 3).

| Requirement | Criterion (scenario) | Tests | Level |
| --- | --- | --- | --- |
| FR-1, NFR-2 | Signed-out visitor opens `/account` → ends on `/login`, no profile read | `AccountAuthorSection` loader: with `requireSession` redirecting, `getMyAuthorProfile` is never called; `requireSession` calls `redirect("/login")` only for `signed-out` (was `requireUserId` until FR-20) | unit |
| FR-1, NFR-2 | (same) | Browser: signed-out `/account` lands on `/login` | end-to-end |
| FR-2, NFR-2 | Signed-out visitor opens `/account/author` → `/login` | `AuthorEditorPanel` loader: no profile read when `requireSession` redirects; browser: expired session on `/account/author` lands on `/login` | unit + end-to-end |
| FR-8 (route-groups) | Authorized pages check the session themselves; layout has no session read | Group-layout test: `(authorized)/layout.tsx` renders children unchanged; browser: both account URLs redirect when signed out | unit + end-to-end |
| FR-8 (route-groups) | Layout adds no markup | Existing `group-layouts.test.tsx` still passes | unit |
| FR-1 | No profile yet → «Создать кабинет автора», no public link | `AccountAuthorLinks` with `profile = null` | unit |
| FR-1 | Every field deleted → «Создать кабинет автора» | `hasProfileContent` false for an all-null row; `getMyAuthorProfile` returns `null` for an empty row | unit |
| FR-1 | Profile exists but not public → «Редактировать профиль автора», no public link | `AccountAuthorLinks` with a first name only | unit |
| FR-1 | Public profile → edit link + «Открыть публичную страницу» `/authors/<id>` | `AccountAuthorLinks` with both names | unit |
| FR-18 | Account page profile can't be loaded → alert message | `AccountAuthorSection` view with a failed read renders the `role="alert"` text | unit |
| FR-3 (auth FR-7) | Signed out: site link, «Наши авторы», Sign in; no Sign out / Мастерская поэта | `AuthStatus` (signed out) + layout header test | unit |
| FR-3 (auth FR-7) | Signed in: «Наши авторы», «Мастерская поэта» (`AccountLink`), Sign out; no email | `AuthStatus` (signed in), `AccountLink` | unit |
| FR-3 (auth FR-7) | Session check fails (no claims or a non-retryable error) → Sign in + «Наши авторы» | `getSessionState` → `signed-out` for those results; `AuthStatus` with `signed-out` | unit |
| FR-20 (auth FR-7) | Session check unavailable (retryable error, throw, or no config) → «Наши авторы» + the empty placeholder; no Sign in, Sign out, or Мастерская поэта; page still renders | `getSessionState` → `unknown` for those results; `AuthStatus` with `unknown` renders `HeaderAuthPlaceholder` only; `HeaderAuthLinksContent` passes the state name, never the user id | unit |
| FR-3 (auth FR-7) | Pending check → no Sign in, Sign out, or Мастерская поэта; «Наши авторы» present | `HeaderAuthLinks` fallback test; layout nav renders outside the boundary | unit |
| FR-3 | Header links for both states in a real page | Browser: header signed in and signed out | end-to-end |
| FR-4 | First name only → not listed, `/authors/<id>` 404 | pgTAP: anon select returns no row for a first-name-only profile; `getPublicAuthor` maps "no row" → `not-found` | integration + unit |
| FR-4 | Both names → listed as "Anna Akhmatova" | pgTAP: anon sees the row; `AuthorList` renders the link | integration + unit |
| FR-4 | Deleting a name hides the profile and keeps the rest | `clearProfileField` clears only that column; `isPublicProfile` false; browser: delete last name → 404 page, other fields still in the editor | unit + end-to-end |
| FR-4 | Database enforces the rule (anon select of a non-public row) | pgTAP anon select | integration |
| FR-5, NFR-2 | Another user cannot write or upload into A's folder | pgTAP: B's update of A's row affects 0 rows; B's insert into `<A id>/…` in storage is denied; B's delete from `<A id>/…` is denied | integration |
| FR-5 | One profile per user | pgTAP: a direct insert is denied; `ensure_my_author_profile()` twice returns the same row and only one row exists; `writeOwnProfile` calls it then updates by id | integration + unit |
| FR-5 | URL and photo URL use the profile id, not the user id | `getPublicAuthor` builds `photoUrl` from `<profile id>/…`; `AuthorList` hrefs use the profile id | unit |
| FR-5, NFR-2 | API read of `user_id` rejected | pgTAP: `select user_id` as anon and as authenticated → permission denied; anon cannot call `ensure_my_author_profile()` | integration |
| FR-5, NFR-2 | `photo_path` into another profile's folder rejected | pgTAP check violation | integration |
| FR-5, NFR-2 | Protected columns (`id`, `user_id`, `created_at`) not updatable | pgTAP: update as authenticated → permission denied | integration |
| FR-5, NFR-2 | Dot segments in photo path rejected | pgTAP: `<own>/../<other>/<file>.jpg` and a non-uuid name → check violation | integration |
| FR-5, NFR-2 | Whitespace-only name rejected | pgTAP check violation | integration |
| FR-5, NFR-2 | A real save runs through the grants | pgTAP: `ensure_my_author_profile()` + update-by-id-returning with the column list as `authenticated` succeeds | integration |
| FR-5, NFR-2 | Manual two-user check of all of the above via REST | Task 9.2 manual validation (recorded in the commit body) | end-to-end |
| FR-6 | Empty profile → four add prompts, photo placeholder, no public link | `AuthorProfileEditor` with `profile = null` | unit |
| FR-6 | Edit opens the input labelled «Имя» with «Сохранить»/«Отмена» | `NameFieldEditor` | unit |
| FR-6 | Only one field is edited at a time; enabled again after Отмена or success | `AuthorProfileEditor` with `editingField` set: the other fields' controls are disabled | unit |
| FR-6 | Отмена discards the draft; no action called | `NameFieldEditor` | unit |
| FR-2, FR-6 | «Открыть публичную страницу» at the top when public | `AuthorProfileEditor` with both names: the link is the first element | unit |
| FR-7 | Pending save → text value, disabled «Сохранение…», no input; others disabled | `NameFieldEditor` + `AuthorProfileEditor` with an unresolved action promise | unit |
| FR-7 | Successful save → «Изменить» enabled, «Сохранено» in `role="status"`, others enabled | Same, with the promise resolved | unit |
| FR-7, NFR-5 | Repeated saves are each announced | Two sequential saves: the status region empties while pending and reads «Сохранено» after each | unit |
| FR-7 | Failed save → back to the input with the draft, error via `aria-describedby`, Отмена shows the saved value | `NameFieldEditor` with a `failed` result | unit |
| FR-7 | Optimistic flow in a real browser | Browser: create the profile field by field; pending, disabled, and «Сохранено» observed | end-to-end |
| FR-8 | Name too long → «Не более 60 символов.», no DB write | Schema test (61); action test: validation → no DAL call | unit |
| FR-8 | Blank after trimming → «Обязательное поле.» | Schema test | unit |
| FR-8 | 60 emoji accepted | Schema test (code points) | unit |
| FR-8 | 60 characters plus spaces → trimmed value stored | Schema test (trimmed output); `writeOwnProfile` receives the trimmed value | unit |
| FR-8 | About over 1000 → «Не более 1000 символов.», no write | Schema test; action test | unit |
| FR-8 | About surrounding whitespace trimmed before storing | Schema test (1000 + whitespace accepted, output trimmed) | unit |
| FR-8 | Markdown syntax counts (996 + `**…**` = 1000 accepted) | Schema test | unit |
| FR-8 | Invalid alignment → validation error, no write | Schema test; action test | unit |
| FR-8 | 6 MB photo caught in the browser; nothing sent | `validatePhotoFile` → `too-large` without reading bytes; `PhotoFieldEditor`: action not called | unit |
| FR-8 | GIF renamed `.png` caught in the browser; nothing sent | `detectImageType` GIF → `null`; `PhotoFieldEditor`: action not called | unit |
| FR-8 | Same two cases checked in the browser itself (network tab shows no request) | Browser pass | end-to-end |
| FR-8 | Server repeats the check (disguised GIF, 5 MiB + 1) | Action test: field error, `replacePhoto` not called | unit |
| FR-8 | Valid 2 MB PNG stored and shown | `replacePhoto` happy path; browser upload | unit + end-to-end |
| FR-9 | Session expired → «Сессия истекла. Войдите снова.», no write | Action test: `getSessionState` → `signed-out` → `unauthenticated`, DAL not called; `classifyProfileError` JWT/401 → `unauthenticated` | unit |
| FR-9 | Backend unavailable or config missing → «Сохранение сейчас недоступно…» | `classifyProfileError` 5xx, network, and config → `unavailable`; form-state mapping | unit |
| FR-9, FR-20 | Session check unavailable on save → «Сохранение сейчас недоступно…», not the session-expired text; no write | Action test: `getSessionState` → `unknown` → `unavailable`, DAL not called | unit |
| FR-9, NFR-3 | Unexpected throw → generic message; log has the name only | `createActionClient` factory test; action test with a throwing DAL | unit |
| FR-9 | Request rejected before the action → generic message, no error screen | `NameFieldEditor` with a rejecting action promise | unit |
| FR-10 | Delete about → «Добавить «О себе»», «Сохранено», later save starts left-aligned | `clearProfileField("about")` sets `about_align` left; `AboutFieldEditor` delete flow | unit |
| FR-10 | Delete photo → placeholder + «Добавить фото», file gone, public page shows the placeholder | `removePhoto` order (row, then file); `PhotoFieldEditor` delete; browser check of editor and public page | unit + end-to-end |
| FR-10 | Delete photo fails → previous photo back, file still exists | `removePhoto` with a failing row update: storage `remove` not called; `PhotoFieldEditor` failure | unit |
| FR-10 | Delete pending → empty state with disabled «Удаление…»; others disabled | `NameFieldEditor` delete with an unresolved promise | unit |
| FR-10 | Delete fails → value, Изменить/Удалить, and error back | `NameFieldEditor` delete failure | unit |
| FR-10 | Delete with no row (stale tab) → `saved` | `clearProfileField` with `maybeSingle` returning `null` | unit |
| FR-11 | «Жирный» wraps the selection and keeps it selected | `applyFormat("bold")`; `AboutFieldEditor` toolbar click | unit |
| FR-11 | Block format prefixes each line | `applyFormat("bulleted")` multi-line | unit |
| FR-11 | Every other format, with and without a selection (placeholder «текст») | `applyFormat` table test (7 formats × 2) | unit |
| FR-11 | «Просмотр» renders `## Hi` as h2 | `AboutFieldEditor` | unit |
| FR-11 | Counter reads "42 / 1000" | `AboutFieldEditor` | unit |
| FR-11 | 1012-character paste kept; counter "1012 / 1000" in danger colour; save shows the error | `AboutFieldEditor` | unit |
| FR-11 | Counter matches validation ("  hi  " → "2 / 1000") | `AboutFieldEditor` | unit |
| FR-12 | Replace leaves only the new file | `replacePhoto`: upload, update, then remove the old path; compensating remove on update failure; best-effort removal logged; browser replace | unit + end-to-end |
| FR-13 | Sorted list (Akhmatova, Pasternak, Tsvetaeva) | `compareAuthors`; `listPublicAuthors` returns sorted output | unit |
| FR-13 | Case-insensitive order with an id tiebreak | `compareAuthors` table test | unit |
| FR-13 | Empty directory → «Пока нет авторов.» | `AuthorList` | unit |
| FR-13 | Directory unavailable → «Список авторов сейчас недоступен.» | `listPublicAuthors` error → `unavailable`; `AuthorList` | unit |
| FR-14 | Full profile: h1, alt «Фото: Anna Akhmatova», centred h2 | `AuthorProfileView`, `AuthorPhoto`, `AuthorAbout` | unit |
| FR-14 | No photo → placeholder | `AuthorPhoto` with `photoUrl = null` | unit |
| FR-14 | Unknown or malformed id → 404 page | `getPublicAuthor("not-a-uuid")` → `not-found` with no client call; missing row → `not-found`; browser: 404 UI shown | unit + end-to-end |
| FR-15 | Owner sees «Редактировать профиль» | `AuthorOwnerLinkView` with `isOwner` | unit |
| FR-15 | Other or anonymous visitor sees no link | `AuthorOwnerLinkView` without `isOwner`; browser with a second user | unit + end-to-end |
| FR-16 | Desktop: photo box 300 × 400 | Browser at a 1024 px width: measured box | end-to-end |
| FR-16 | Narrow: full container width, 3:4 | Browser at a 390 px width | end-to-end |
| FR-16 | `next/image` gets `sizes`, and `unoptimized` only for local hosts | `AuthorPhoto` + local-host helper test; `remotePatterns` helper test | unit |
| FR-17 | Name change shows immediately on both pages | Action test: success → `updateTag("authors")` and `updateTag("author:<id>")`; browser: edit, then `/authors` and `/authors/<id>` show the change | unit + end-to-end |
| FR-18 | Editor can't load → alert, no field editors | `AuthorEditorPanel` view with a failed read | unit |
| FR-18 | Owner link on a failed read → no link | `AuthorOwnerLink` view with a failed read | unit |
| NFR-7 | Unavailable read heals (cached for seconds); not-found for minutes; ok for hours | `public-authors` tests assert `cacheLife("seconds" / "minutes" / "hours")` per result | unit |
| NFR-8 | Validation messages are Russian | Schema / messages tests assert exact Russian strings | unit |
| NFR-8 | `lang="ru"` on the feature's content | `AuthorList`, `AuthorProfileView`, `AccountAuthorLinks`, and `AuthorProfileEditor` root assertions; header links in `AuthStatus` / layout; browser check | unit + end-to-end |
| NFR-8 | «Редактировать профиль» precedes the h1 | `AuthorProfileView` composition test | unit |
| NFR-1 | `<script>` in about → no script element | `AuthorAbout` | unit |
| NFR-1 | Link becomes text, no `a`; image → alt text, no `img` | `AuthorAbout` | unit |
| NFR-3 | No privileged key in source | Task 9.1 grep `SUPABASE_SERVICE_ROLE\|SUPABASE_SECRET` → none | integration |
| NFR-3 | Logs carry error names only | DAL-write and action tests assert log arguments contain no input values | unit |
| NFR-4 | Only `react-markdown` added; no colour literals | Task 9.1 dependency diff and colour grep | integration |
| NFR-5 | Field error wiring (`aria-invalid`, `aria-describedby`) | `NameFieldEditor` / `FieldErrorText` | unit |
| NFR-5 | Shared `TextField` keeps the label and error wiring after the move from auth | `TextField` test; the existing `SignInForm`/`SignUpForm` tests pass unchanged | unit |
| NFR-5 | Toolbar buttons have Russian accessible names | `AboutFieldEditor` `getByRole("button", { name })` × 7 | unit |
| NFR-6 | Build without env exits 0; route table modes | Task 9.1 `npm run build` with no Supabase env | integration |
| Proposal headline | GIF / 6 MB → error before sending | Same as the FR-8 browser-check rows | unit + end-to-end |
| Proposal headline | Deleted photo → placeholder in the editor and on the public page | Same as the FR-10 delete-photo row | unit + end-to-end |
| Proposal headline | Direct API `photo_path` into another file → rejected | Same as the FR-5 pgTAP rows | integration |
| FR-19 (auth FR-6) | The refresh keeps its cookie, headers, and no-store behaviour; a cookie-less request outside `/account` gets no no-store | Existing `session.test.ts` and `proxy.test.ts` cases, unchanged | unit |
| FR-19 (auth FR-6) | The refresh reports signed-in, signed-out, or unknown from one `getClaims()` call | `session.test.ts`: each state, `getClaims` called once | unit |
| FR-19 (auth FR-6) | Rule order: retryable error, 5xx, or 429 → unknown (even with claims); any other error → signed-out (even with claims); non-empty `sub` → signed-in; anything else, including claims without `sub` → signed-out | `claims.test.ts`: `readClaimsState` table | unit |
| FR-19 (auth FR-6) | Missing config → unknown, request continues | `session.test.ts` config-error case | unit |
| FR-19 | Signed-out GET for `/account/author` → 307, `Location` parses to the same origin, path `/login`, no query; four security headers; no-store | `proxy.test.ts` | unit |
| FR-19 | `/account`, `/account/`, `/account/author/x` redirect; `/accounts` and `/authors` don't | `account-paths.test.ts` (`isAccountPath` table) + `proxy.test.ts` pass-through cases | unit |
| FR-19 | A revoked session's cleared cookies are on the redirect | `proxy.test.ts` with a refresh that clears cookies | unit |
| FR-19, FR-9 | A Server Action POST (`Next-Action`) while signed out is not redirected; the field shows «Сессия истекла. Войдите снова.» | `proxy.test.ts` POST case; browser: sign out in another tab, then save a field (task 9.3) | unit + end-to-end |
| FR-19 | Signed-in and unknown requests pass through | `proxy.test.ts` | unit |
| FR-19 | Signed-out `/account` and `/account/author` get the proxy's 307, with no flash of the page | Browser, network tab (task 9.3) | end-to-end |
| FR-19 | Proxy and page gate read a `getClaims()` result the same way | `getSessionState` and `refreshSession` both use `readClaimsState` (checked by the `claims.test.ts` table and both callers' tests) | unit |
| FR-20 | `/account` during an outage: «Мастерская поэта», «Профиль автора», the alert «Сервис временно недоступен. Попробуйте позже.» with «Повторить», no links, no redirect, no profile read | `AccountAuthorSection` with `requireSession` → `unknown`: alert rendered, `getMyAuthorProfile` not called | unit |
| FR-20 | `/account/author` during an outage: the alert and «Повторить» in place of the editor, no field editor | `AuthorEditorLoader` with `requireSession` → `unknown` | unit |
| FR-20 | «Повторить» re-requests the server data, disabled while pending | `SessionUnavailableAlert` retry-button test: `router.refresh` called inside a transition, button disabled while pending | unit |
| FR-20 | `requireSession` redirects only on signed-out; `getSessionState` awaits `connection()` before creating the client | `current-user.test.ts` | unit |
| FR-20 | Real outage: stop the local stack → alert, no redirect, header with neither link; restart and «Повторить» → section renders | Browser (task 9.3) | end-to-end |
| Proposal headline | Signed-out `/account` or `/account/author` → `/login` (proxy 307; page redirect as fallback) | Same as the FR-19 redirect rows and the FR-1/FR-2 rows | unit + end-to-end |
| Proposal headline | Expired session while editing → save shows the field error, no redirect | Same as the FR-19 Server Action row | unit + end-to-end |
| Proposal headline | Auth unreachable → alert on `/account`, no redirect, header with neither link | Same as the FR-20 rows | unit + end-to-end |
