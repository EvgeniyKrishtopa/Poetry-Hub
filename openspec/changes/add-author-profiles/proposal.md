# Proposal

## Why

Poetry Hub has sign-in, but a signed-in reader has nothing of their own yet. The next step toward reader-owned content (ADR 0003) is an author identity: a signed-in reader can create a public author profile with a name, a short bio, and a photo. Other readers can find that author through an "Наши авторы" directory. This is the first Supabase table holding reader data. It also establishes the patterns later reader content (poems) will reuse:
- an owner-scoped table behind RLS;
- per-field Server Actions with optimistic UI;
- a public, cached read path that a write expires.

## What Changes

- Add a personal account page `/account` and an author-profile editor `/account/author`, both for signed-in readers only. These are the first pages in the `(authorized)` route group. Each page checks the session on the server; a signed-out request is redirected to `/login`.
- The proxy also redirects a signed-out page request under `/account` to `/login` before anything renders (FR-19), as an extra layer on top of the pages' own check.
- Add a public author directory `/authors` and a public author page `/authors/[id]`. Both are cached, and an owner's edit expires the cache.
- Add a Supabase table `author_profiles`, at most one row per user, protected by row-level security. Add a public Storage bucket `author-photos` whose write policies restrict each user to their own folder. Both live in the first versioned migration under `supabase/migrations/`.
- Add feature `src/features/authors/`. Each field (first name, last name, about, photo) is created, edited, saved, and deleted on its own through a `next-safe-action` Server Action, driven by `useActionState` with optimistic display.
- "About" is Markdown, edited with a toolbar. Alignment is one setting for the whole section. It is rendered with `react-markdown`, with raw HTML disabled.
- Header: an "Наши авторы" link for every visitor, and a "Мастерская поэта" link for signed-in readers.
- `next.config.ts`:
  - raise the Server Action body limit so a 5 MB photo fits;
  - allow the Supabase Storage host for `next/image`.
- Add the runtime dependency `react-markdown`.

## Requirements

### Account and access

- **FR-1**: `/account` SHALL be reachable only with a valid session. Without one, the request SHALL be redirected to `/login`, unless the session can't be checked (FR-20). The page SHALL show the reader's author-profile section:
  - no profile, meaning no row or a row with no field filled → a "Создать кабинет автора" link to `/account/author`;
  - a row exists → an "Редактировать профиль автора" link to `/account/author`;
  - the profile is public (FR-4) → also a "Открыть публичную страницу" link to `/authors/<id>`.
- **FR-2**: `/account/author` SHALL be reachable only with a valid session. Without one, the request SHALL be redirected to `/login`, unless the session can't be checked (FR-20). It SHALL show the editor (FR-6–FR-12) for the signed-in reader's own profile, which may not exist yet. Once the profile is public, a "Открыть публичную страницу" link to `/authors/<id>` SHALL appear at the top.
- **FR-3**: The header SHALL show an "Наши авторы" link to `/authors` to every visitor. When signed in, it SHALL also show a "Мастерская поэта" link to `/account` next to "Sign out".

### Profile data and visibility

- **FR-4**: A profile SHALL be **public** exactly when both its first name and its last name are non-empty. Photo and about are optional.
  - A profile that is not public SHALL appear neither on `/authors` nor at `/authors/<id>` (404).
  - Deleting the first or last name SHALL make the profile non-public. The other fields SHALL be kept.
  - The database SHALL enforce this rule (RLS). The UI alone is not enough.
- **FR-5**: Each user SHALL own at most one profile. Only the owner SHALL create, update, or delete it, or the files in their photo folder.
  - **Direct API writes.** The database SHALL hold even when the app is bypassed and the database API is called directly with the publishable key. In that case it SHALL reject:
    - a write to the profile's id, owner, or creation time;
    - a photo path outside the profile's own folder;
    - a name or about that is empty or whitespace-only.
  - **Identifiers.** The profile's public identifier SHALL be its own UUID. The auth user id SHALL NOT appear in public pages, photo URLs, or any API read, anonymous or signed in (code-review CR-01, user decision 2026-10-15).

### Editor behavior

- **FR-6**: The editor SHALL show four fields: first name, last name, about, and photo. Each field has its own controls:
  - **empty** → a prompt to add it ("Добавить имя", "Добавить фамилию", "Добавить «О себе»", "Добавить фото"). An empty photo field also shows the user-icon placeholder (FR-16);
  - **has a value** → the value, plus "Изменить" and "Удалить" buttons;
  - **editing** → the input, plus "Сохранить" and "Отмена" buttons.

  At most one field SHALL be in edit mode at a time. While a field is being edited, every other field's "Изменить", "Удалить", and add prompt SHALL be disabled until that field is saved or cancelled.
- **FR-7**: Saving a field SHALL call that field's Server Action through `useActionState`. While the save is pending:
  - the field SHALL leave edit mode at once and show the submitted value optimistically, as plain text, with no input;
  - in place of "Изменить" and "Удалить" it SHALL show one disabled button reading "Сохранение…";
  - every other field's "Изменить", "Удалить", and add prompts SHALL be disabled.

  On success, the field SHALL stay in view mode showing the saved value with "Изменить" available again, and a notification "Сохранено" SHALL be announced in a `role="status"` region. On failure, the field SHALL return to edit mode, with only the input showing and the submitted draft kept in it, and the error under the field. The value shown after any later Cancel is the last saved value. Edit mode shows only the input, never a separate value line (spec-clarify 2026-10-15).
- **FR-8**: Validation, on the server, with the same schema the action enforces:
  - **First name, last name**: trimmed, 1–60 characters each, counted in Unicode code points (as about is, and as the database counts). An empty value is invalid; removing a name uses "Удалить" (FR-10).
  - **About**: Markdown source, trimmed. The trimmed value is what is stored, and it must be 1–1000 characters. The length counts the Markdown syntax too.
  - **Alignment**: one of `left`, `center`, `right`.
  - **Photo**: a PNG or JPEG file of at most 5 MB (5 × 1024 × 1024 bytes). The type is checked by the file's content, not its name.

  A violation SHALL be returned as a field error and shown under that field. No database or storage call SHALL be made.

  The photo's size and type SHALL also be checked in the browser, both when the file is chosen and before it is sent. A violation there SHALL show the same field error, and no request SHALL be sent (user decision 2026-10-15).
- **FR-9**: Server and data-access failures SHALL be shown under the field that triggered them, with a message chosen by failure kind:
  - not signed in → "Сессия истекла. Войдите снова.";
  - storage or database unavailable → "Сохранение сейчас недоступно. Попробуйте позже.";
  - anything else → "Что-то пошло не так. Попробуйте ещё раз." This includes an unexpected throw caught by the action client, and a request that the server or the network rejects before the action runs.

  These failures SHALL never replace the page with the error screen. The data-access layer (DAL) SHALL return typed failures and never throw for an expected failure. The action client SHALL turn an unexpected throw into the generic message.
- **FR-10**: "Удалить" on a field SHALL clear that field through its Server Action at once, with no confirmation step, with the same optimistic, notification, and error behavior as saving (FR-7, FR-9). While the delete is pending, the field SHALL show its empty state at once: the add prompt, plus the placeholder for photo. That add prompt is disabled and reads "Удаление…". On success it stays empty with the add prompt enabled. On failure the previous value returns with the error under the field.
  - Deleting about SHALL also reset the alignment to `left`.
  - Deleting the photo SHALL remove the stored file. Afterwards the editor and the public page SHALL show the user-icon placeholder, the same as before any photo was added.
- **FR-11**: The about editor SHALL offer a toolbar that inserts Markdown around the selection: «Жирный», «Курсив», «Заголовок» (H2), «Подзаголовок» (H3), «Маркированный список», «Нумерованный список», and «Цитата». It SHALL also offer an alignment control («По левому краю» / «По центру» / «По правому краю»), a «Редактор»/«Просмотр» toggle, and a live character count against 1000. The count uses the same measure as validation (code points after trimming). It may exceed 1000, and over the limit it is shown in the danger colour. No input caps typing or truncates a paste: an over-limit value is rejected on save with the field error (spec-clarify 2026-10-15).
- **FR-12**: Uploading a photo that replaces an existing one SHALL leave only the new file stored for that profile.

### Public pages

- **FR-13**: `/authors` SHALL list every public profile as a link to `/authors/<id>`, labelled "<first name> <last name>", sorted by last name, then first name, case-insensitively by Unicode code point, so Latin sorts before Cyrillic. Identical names are ordered by profile id, so the order is stable. When no public profile exists, it SHALL show "Пока нет авторов."
- **FR-14**: `/authors/[id]` SHALL render a public profile:
  - the full name as the page heading;
  - the photo, or a user-icon placeholder when there is none;
  - the about section rendered from Markdown with its alignment, or nothing when about is empty.

  An `id` that is not a UUID, or that names no public profile, SHALL render the 404 page. The page is streamed, so the HTTP status may be 200 (a soft 404); the 404 UI is what is required.
- **FR-15**: When the signed-in reader owns the profile, `/authors/[id]` SHALL show an "Редактировать профиль" link to `/account/author` at the top of the page. Other visitors SHALL NOT see it.
- **FR-16**: The photo SHALL display at 300 × 400 CSS pixels (cropped to cover) on viewports 460 px wide or wider. On narrower viewports it SHALL take the full width of the page's content container (the same `max-w-4xl px-6` column the header uses), not the window, at the same 3:4 ratio. The placeholder SHALL follow the same sizing.
- **FR-17**: Public author data SHALL be cached. A successful save or delete SHALL expire both that author's cached data and the directory's, so the owner's next view of either page shows the change (read-your-own-writes).

- **FR-19**: The proxy SHALL answer a page request for `/account` or any path under `/account/` that has no valid session with a 307 redirect to `/login`, before any page renders. It is an optimistic layer on top of NFR-2's page check, which stays. A page request is a GET or HEAD without a `Next-Action` header; anything else passes through. In particular (user decision 2026-10-16, PR #81 discussion):
  - a Server Action call SHALL NOT be redirected, so an expired session still gets FR-9's message under the field;
  - the redirect SHALL carry the session refresh's cookies (a cleared dead session included), the four security headers, and `Cache-Control: private, no-store`;
  - when the proxy can't tell (missing config, a network or Supabase outage error, returned or thrown), it SHALL let the request through, and the page's own check decides;
  - the proxy and the page gate SHALL read a `getClaims()` result with one shared rule, so they can't disagree on who is signed in;
  - the session SHALL be read by the proxy's existing session refresh, with no additional Supabase call;
  - `/login` SHALL be reached without a return-to parameter.
- **FR-20**: When the session can't be checked because Supabase is unreachable or failing, or its config is missing (FR-19's "can't tell" state, not a missing or invalid session), the app SHALL say so instead of treating the reader as signed out (user decision 2026-10-16, PR #81 discussion):
  - `/account` and `/account/author` SHALL show «Сервис временно недоступен. Попробуйте позже.» in a `role="alert"` element with a «Повторить» button that reloads the page's data, instead of redirecting to `/login`, and SHALL read no profile data;
  - the header's session part SHALL show neither "Sign in" nor "Мастерская поэта"/"Sign out", only the same empty placeholder as while it loads;
  - a profile action SHALL fail with FR-9's "Сохранение сейчас недоступно. Попробуйте позже.", not the session-expired message.
- **FR-18**: If the reader's own profile can't be read, `/account` and `/account/author` SHALL show "Не удалось загрузить профиль. Попробуйте позже." instead of the section or editor. `/authors/[id]` SHALL then show no "Редактировать профиль" link.

### Non-functional

- **NFR-1**: Rendered Markdown SHALL allow no raw HTML. Only these elements SHALL be allowed: paragraphs, strong, emphasis, h2, h3, lists, list items, blockquotes, and line breaks. Links and images SHALL be rendered as plain text.
- **NFR-2**: Authorization is enforced in three places, each independently:
  - the page checks the session on the server (never only in a layout, and never only in the proxy: FR-19's redirect is an extra, optimistic layer);
  - every action resolves the user from the session and never trusts a client-sent user or profile id;
  - RLS and Storage policies restrict writes to the owner.
- **NFR-3**: Only the publishable key SHALL be used; no service-role key is read. Action logs SHALL carry an error's `name` only, never input values or file contents.
- **NFR-4**: Relative to `main`, the change SHALL add exactly one runtime dependency, `react-markdown`. New components SHALL use existing design tokens and Tailwind utilities only, with no color literals.
- **NFR-5**: Accessibility:
  - every input has a visible label;
  - field errors are linked through `aria-describedby` and set `aria-invalid`;
  - toolbar buttons have accessible names;
  - the photo has alt text "Фото: <full name>", and the placeholder is `aria-hidden` with no alt text;
  - the save notification is announced through `role="status"`.
- **NFR-6**: `npm run build` SHALL succeed with no Supabase env set. `/authors` and `/authors/[id]` SHALL be partially prerendered with cached content. `/account` and `/account/author` SHALL render per request.
- **NFR-7**: Cached public reads SHALL keep a failure only briefly, so the page recovers without a deploy:
  - an unavailable read for seconds;
  - a not-found result for minutes;
  - a successful read for hours.

- **NFR-8**: Every user-facing text this change adds SHALL be in Russian. That covers buttons, labels, prompts, toolbar names, headings, notifications, validation and error messages, alt text, and the two header links. The exact strings are in the UI copy table below. The elements that render this text SHALL carry `lang="ru"`, so screen readers use a Russian voice while the app root stays `lang="en"`. Existing auth screens are unchanged (Out of Scope; user decision 2026-10-15).
## UI copy (NFR-8)

| Key | Text |
| --- | --- |
| Header links | «Наши авторы», «Мастерская поэта» (was «Личный кабинет»; user decision 2026-10-16, PR #80 review) |
| Account section | «Создать кабинет автора», «Редактировать профиль автора», «Открыть публичную страницу» |
| Field labels | «Имя», «Фамилия», «О себе», «Фото» |
| Add prompts | «Добавить имя», «Добавить фамилию», «Добавить «О себе»», «Добавить фото» |
| Field buttons | «Изменить», «Удалить», «Сохранить», «Отмена»; pending «Сохранение…», «Удаление…» |
| Photo picker | «Выбрать фото», then the chosen file's name next to it; replaces the browser's own file-input text, which follows the browser's language (user decision 2026-10-16, PR #81 discussion) |
| Notification | «Сохранено» |
| Toolbar | «Жирный», «Курсив», «Заголовок», «Подзаголовок», «Маркированный список», «Нумерованный список», «Цитата»; «По левому краю», «По центру», «По правому краю»; «Редактор», «Просмотр»; counter «N / 1000» |
| Toolbar placeholder word (empty selection) | «текст» |
| Validation | «Обязательное поле.», «Не более 60 символов.», «Не более 1000 символов.», «Файл должен быть не больше 5 МБ.», «Допустимы только изображения PNG или JPEG.», «Недопустимое выравнивание.» |
| Failures (FR-9) | «Сессия истекла. Войдите снова.», «Сохранение сейчас недоступно. Попробуйте позже.», «Что-то пошло не так. Попробуйте ещё раз.» |
| Load failure (FR-18) | «Не удалось загрузить профиль. Попробуйте позже.» |
| Session check unavailable (FR-20) | «Сервис временно недоступен. Попробуйте позже.»; button «Повторить» |
| Directory | page heading «Наши авторы»; «Пока нет авторов.»; «Список авторов сейчас недоступен.» |
| Account page heading | «Мастерская поэта»; editor page heading «Профиль автора» |
| Author page | «Редактировать профиль»; photo alt «Фото: <имя фамилия>» |

## Mockups

Approved Claude Design canvas (2026-10-15): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z. Each screen is one artboard, drawn in light and dark at desktop 1024 px and mobile 390 px.

| Screen | Artboard |
| --- | --- |
| Header (all pages) | «1 · Header — all pages» |
| `/account` | «2 · /account — Личный кабинет» (the artboard's title; the page now reads «Мастерская поэта», see the UI copy table) |
| `/account/author` | «3 · /account/author — Профиль автора (editor)» |
| `/authors` | «4 · /authors — Наши авторы» |
| `/authors/[id]` | «5 · /authors/[id] — author page» |

Where a mockup and a requirement disagree, the requirement wins; `ui-plan.md` lists each such point.

## Acceptance Criteria

Each FR/NFR above is accepted by the scenarios in `specs/*/spec.md`, all written as Given/When/Then. Headline criteria:

- **GIVEN** a signed-out visitor, **WHEN** they request `/account` or `/account/author`, **THEN** they are redirected to `/login`: by the proxy with an HTTP 307 before the page renders (FR-19), and by the page itself if the proxy let the request through.
- **GIVEN** Supabase Auth is unreachable, **WHEN** a signed-in reader opens `/account`, **THEN** they see «Сервис временно недоступен. Попробуйте позже.» with «Повторить», are not sent to `/login`, and the header shows neither "Sign in" nor "Sign out" (FR-20).
- **GIVEN** a reader whose session expired while the editor was open, **WHEN** they save a field, **THEN** the proxy does not redirect the action call, and "Сессия истекла. Войдите снова." is shown under the field.
- **GIVEN** a signed-in reader with no profile, **WHEN** they open `/account`, **THEN** they see "Создать кабинет автора" linking to `/account/author`.
- **GIVEN** a reader who has saved a first name only, **WHEN** anyone requests `/authors`, **THEN** the reader is not listed. **AND WHEN** they save a last name too, **THEN** they are listed, and "Открыть публичную страницу" appears in the editor.
- **GIVEN** the first-name save is pending, **WHEN** the editor renders, **THEN** first name shows the submitted value with a disabled "Сохранение…" button, and every other field's Edit/Delete is disabled.
- **GIVEN** a 6 MB JPEG or a GIF, **WHEN** it is chosen as the photo, **THEN** a field error appears under the photo before anything is sent, and nothing is uploaded.
- **GIVEN** a saved photo, **WHEN** its owner deletes it, **THEN** the editor and the public page show the user-icon placeholder.
- **GIVEN** a signed-in user, **WHEN** they call the database API directly to set their `photo_path` to another profile's file, **THEN** the write is rejected.
- **GIVEN** a public profile, **WHEN** its owner deletes the last name, **THEN** `/authors/<id>` returns 404 and the directory no longer lists it.
- **GIVEN** about text containing `<script>alert(1)</script>`, **WHEN** the public page renders, **THEN** no `script` element is in the output.

## Capabilities

### New Capabilities
- `author-profiles`: the author profile data rules (visibility, ownership, validation), the per-field editor, and the public directory and author pages.
- `reader-account`: the signed-in-only `/account` page and the server-side session gate for pages in the `(authorized)` group.

### Modified Capabilities
- `auth`: the session-aware header (FR-7) gains "Наши авторы" for everyone and "Мастерская поэта" for signed-in readers. The proxy's session refresh (FR-6) also reports whether the session is valid, and the proxy redirects a signed-out page request under `/account` to `/login` (FR-19). The header (FR-7) gains a third state: when the session can't be checked, it shows only its empty placeholder (FR-20).
- `route-groups`: the pass-through layouts requirement (FR-8) no longer forbids pages in `(authorized)/`. It now states that pages there enforce the session themselves.

## Out of Scope

- Poems, or linking poems to authors.
- Pagination or search on `/authors`.
- Image cropping or resizing at upload; server-side image transformation.
- Moderation, reporting, or admin editing of profiles.
- Deleting the whole profile in one action (each field is deleted on its own).
- Cleaning up Storage files when an auth user is deleted, and orphaned files from a failed cleanup step.
- Links and images inside about.
- HttpOnly session cookies (a separate follow-up).
- Returning to the requested page after sign-in (`/login?next=…`): the parameter must be validated against open redirects, so it is a separate feature (user decision 2026-10-16).

## Open Questions

None at proposal time. User decisions on 2026-10-15:
- Markdown with a toolbar, and alignment as one setting for the section;
- public requires first AND last name;
- `/authors/[id]` by profile UUID;
- the directory and author pages are public to guests.

## Impact

- **Code:**
  - new `src/features/authors/`;
  - `src/features/auth/` (header link, a server-only "current user id" DAL, its action client rebuilt on a shared factory);
  - new `src/shared/lib/safe-action/` (the action-client error policy shared by auth and authors);
  - new `src/shared/ui/TextField` (auth's `AuthField`, promoted for reuse by the editor);
  - `src/shared/lib/supabase/` (a cookie-less client for cached public reads);
  - new routes under `src/app/(authorized)/account/` and `src/app/(public)/authors/`;
  - `src/app/layout.tsx` (header nav);
  - `src/proxy.ts` and `src/shared/lib/supabase/session.ts` (the account-route redirect, FR-19);
  - new `src/shared/lib/supabase/claims.ts` and `src/shared/config/account-paths.ts` (one reading of a session check; the account and sign-in paths);
  - `src/features/auth/` session states for FR-20: `getSessionState` and `requireSession` (replacing `requireUserId`), a three-state header with `HeaderAuthPlaceholder`, `isSignedIn()` removed; `src/features/authors/` gains `SessionUnavailableAlert`;
  - `next.config.ts`.
- **Database:** first migration `supabase/migrations/<timestamp>_author_profiles.sql`, covering the table, RLS, bucket, and storage policies. It must be applied to the remote project at deploy (`supabase db push`). The local `supabase/config.toml` declares the bucket.
- **Dependencies:** `react-markdown` (runtime).
- **Risk:** high. The change touches the database schema, permissions (RLS), file uploads, and production config. It requires the deep review, manual RLS validation against a local Supabase, and Gate 3.
