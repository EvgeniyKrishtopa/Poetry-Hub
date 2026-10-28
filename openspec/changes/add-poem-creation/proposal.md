# Proposal

## Why

Authors can fill in a profile, but they can't publish anything: every poem on the site is one of
four in-code mock poems, handed out by a hash of the author's id. The site is about poems, so the
next step is letting an author write and publish their own, and showing real poems instead of the
mock set (user request, 2026-10-28).

## What Changes

- **Poem management area** for a signed-in author with a public profile (first and last name
  filled), under `/account`, so the existing proxy redirect and page session gate already keep
  guests out:
  - `/account/poems` — «Ваши Произведения»: the author's own poems, newest first, each title a
    link to the poem, plus a link to add a new poem. With no poems, only the add link.
  - `/account/poems/new` — «Добавление нового произведения»: the add form.
  - `/account/poems/<poemId>` — one of the author's own poems, the same view as the public poem
    page, with its own breadcrumb trail. This is the second way to reach a poem for its author;
    guests and other readers reach it only through «Наши авторы».
- **Entry links** «Управление произведениями» to `/account/poems`: on the account page
  («Мастерская поэта») next to the profile links, and on the owner's own public author page
  next to «Редактировать профиль». Shown only when the reader's profile is public.
- **Add form** with four fields: title (required, at most 80 characters), text (required, at most
  10000 characters, with the profile's Markdown editor tuned for poetry: «Жирный», «Курсив», «Эпиграф»,
  «Разделитель частей» (a centred «* * *»), «Отступ» (shifts lines right), no heading or list
  buttons; «Редактор» / «Просмотр» tabs, live counter — user decision, 2026-10-28), genre (required, a dropdown under the label «Выберите жанр»:
  every genre tag from Contentful plus «Без жанра»), and an optional illustration (PNG or JPEG
  up to 5 MB, the same checks as the profile photo). The form validates in the browser before
  sending, and the Server Action validates again.
- **On success**: the poem is stored for the signed-in author only (the database refuses a row
  for anyone else's profile), the author's poem list is refreshed everywhere it is shown, the
  author is taken to `/account/poems/<poemId>`, and a notification reads «Поздравляем, Ваше
  произведение успешно добавлено.».
- **Write limit**: at most 2 new poems per minute and 20 per day per author, enforced by the
  database function that is the only way to store a poem, so it can't be bypassed through the
  database API (Gate 1, 2026-10-28). It counts the author's stored poems in sliding windows.
- **Real poems replace the mock set**. The author page's «Произведения» section and the poem page
  read the `poems` table. The poem page starts with the illustration when the poem has one, and
  with the title otherwise; its text is rendered as safe Markdown with line breaks kept; the genre
  line shows the genre's current Contentful name, and is left out for «Без жанра».
  **BREAKING (internal)**: `mock-poems.ts`, `mock-poem-count.ts` and `public/mock-poems/` are
  removed; the local seed creates real poem rows instead.
- **One cache per author**: an author's poem list and poems are cached once, under one tag per
  author, and read from that cache by both the public pages and the management pages. Creating a
  poem expires that one tag.
- **Breadcrumbs**: «Мастерская поэта» › «Управление произведениями» › «Добавление нового
  произведения» or › «<poem title>».
- **Loading skeletons** on the three new pages, shown on first load and while a page's server data
  is re-read (for example right after a poem is created).
- **Shared building blocks**: the Markdown editor, the safe Markdown renderer, the image file
  check and picker, and the Supabase error classifier move from the `authors` feature to
  `shared/`, because a second feature now uses them. The profile editor keeps its behaviour.
- Poem data stays on the server: pages are Server Components reading through the DAL, only the add
  form and the notification are client components. TanStack Query is not used yet; it can be added
  over the same DAL when search, filters, or pagination arrive (user decision, 2026-10-28).
- Out of scope: editing and deleting poems, drafts or unpublished poems, search, filters,
  pagination, poem counts in the directory.

## Capabilities

### New Capabilities

- `poem-management`: the author's own poem area under `/account/poems` — entry links, the poem
  list, the add form and its validation, the create action with its ownership and write limits,
  the success notification, and the owner's poem page.

### Modified Capabilities

- `author-poems`: poems come from the database instead of the mock set; the poem page's
  illustration and genre become optional and its text becomes Markdown; read failures get an
  unavailable state; the poems cache is one tag per author.
- `author-profiles`: the owner's public author page gains the «Управление произведениями» link;
  the local seed creates poem rows instead of relying on mock poem counts.
- `reader-account`: the account page's author section gains the «Управление произведениями» link.
- `breadcrumbs`: trail items for the three new pages.

## UI copy

Every new user-facing string, verbatim.

| Key | Text |
| --- | --- |
| Entry link (account page, owner's author page) | `Управление произведениями` |
| Poem list page: heading | `Ваши Произведения` |
| Poem list page: add link | `Добавить новое произведение` |
| Poem list page: profile not public | `Чтобы добавлять произведения, укажите имя и фамилию в профиле автора.` |
| Poem list page and add page: link to the profile editor (profile not public) | `Перейти к профилю автора` |
| Poem list page: own poems can't be read | `Не удалось загрузить произведения. Попробуйте позже.` |
| Add page: heading | `Добавление нового произведения` |
| Add form: title label | `Название произведения` |
| Add form: text label | `Текст произведения` |
| Add form: text counter | `<n> / 10000` |
| Poem editor toolbar: epigraph | `Эпиграф` |
| Poem editor toolbar: part separator | `Разделитель частей` |
| Poem editor toolbar: indent | `Отступ` |
| Poem text: part separator as shown | `* * *` |
| Add form: genre label (above the dropdown) | `Выберите жанр` |
| Add form: genre dropdown, nothing chosen yet | `—` |
| Add form: genre option for no genre | `Без жанра` |
| Add form: illustration label | `Иллюстрация (необязательно)` |
| Add form: illustration picker button | `Выбрать иллюстрацию` |
| Add form: remove the chosen illustration | `Убрать иллюстрацию` |
| Add form: submit | `Добавить произведение` |
| Add form: submit while sending | `Добавление…` |
| Add form: required field empty | `Обязательное поле.` |
| Add form: title too long | `Не более 80 символов.` |
| Add form: text too long | `Не более 10000 символов.` |
| Add form: chosen genre no longer exists | `Этот жанр больше недоступен. Выберите другой.` |
| Add form: illustration too large / wrong type | the profile photo's messages: `Файл должен быть не больше 5 МБ.`, `Допустимы только изображения PNG или JPEG.` |
| Add form: over the write limit | `Слишком много новых произведений. Попробуйте позже.` |
| Add form: session expired / service down / anything else | the profile editor's messages: `Сессия истекла. Войдите снова.`, `Сохранение сейчас недоступно. Попробуйте позже.`, `Что-то пошло не так. Попробуйте ещё раз.` |
| Add page: genres can't be read | `Список жанров сейчас недоступен. Попробуйте позже.` |
| Success notification | `Поздравляем, Ваше произведение успешно добавлено.` |
| Author page «Произведения» section: poems can't be read | `Произведения сейчас недоступны.` |
| Breadcrumb item for `/account/poems` | `Управление произведениями` |
| Breadcrumb item for `/account/poems/new` | `Добавление нового произведения` |

The shared Markdown editor's other strings (`Жирный`, `Курсив`, `Редактор`, `Просмотр`, and the
profile-only format labels) stay the profile editor's existing ones.

## Mockups

Approved Claude Design canvas (2026-10-28): https://claude.ai/artifact/GCN2BZQF5eG454fA1PZG8z#page-dcb81aee8d83, artboards 12, 14 and 16-21, each in light and
dark at 1280 px and 375 px.

| Screen | Artboard |
| --- | --- |
| `/account` author section with «Управление произведениями» | 16 · `/account` — Мастерская поэта, раздел автора (`Workshop.dc.html`) |
| `/authors/<id>` owner links and the poems-unavailable state | 12 · `/authors/[id]` — страница автора с разделом «Произведения» (`AuthorPoemsEntry.dc.html`) |
| `/account/poems` «Ваши Произведения»: list, empty, list failed, not public, session unavailable, loading | 17 · `/account/poems` (`MyPoems.dc.html`) |
| `/account/poems/new` form: empty, filled with an illustration, «Просмотр», sending | 18 · `/account/poems/new` — форма (`NewPoemForm.dc.html`) |
| `/account/poems/new` field errors | 19 · ошибки полей (`NewPoemErrors.dc.html`) |
| `/account/poems/new` form alerts, genres unavailable, not public, loading | 20 · сообщения и особые состояния (`NewPoemStates.dc.html`) |
| `/account/poems/<id>` after a create: notice, no illustration, no genre, loading, error, 404 | 21 · `/account/poems/[id]` (`CreatedPoem.dc.html`) |
| Public poem page with epigraph, «* * *» parts, indents | 14 · `/authors/[id]/poems/[poemId]` (`Poem.dc.html`) |

The management trails are drawn on artboards 17-21; artboard 7 (breadcrumbs) is unchanged.

## Requirements

Each requirement is specified with its scenarios in the delta specs. Summary:

| ID | Requirement | Spec |
| --- | --- | --- |
| FR-1 | «Управление произведениями» entry links, only for a public own profile | poem-management, reader-account, author-profiles |
| FR-2 | `/account/poems` lists the author's own poems, newest first, with the add link; empty and not-public states | poem-management |
| FR-3 | `/account/poems/new` add form: title, Markdown text, genre dropdown, optional illustration | poem-management |
| FR-4 | Field validation in the browser and in the action, with the same rules | poem-management |
| FR-5 | Creating a poem: stored for the caller's own profile only, redirect, notification | poem-management |
| FR-6 | Write limit: 2 per minute and 20 per day per author, enforced in the database | poem-management |
| FR-7 | `/account/poems/<poemId>`: the owner's poem page; 404 for anything else | poem-management |
| FR-8 | Breadcrumb trails for the three new pages | breadcrumbs |
| FR-9 | Poems read from the database instead of the mock set | author-poems |
| FR-10 | Poem page: optional illustration, Markdown text with line breaks, optional genre | author-poems |
| FR-11 | Read failures: unavailable states on the author page section and the management pages | author-poems, poem-management |
| FR-12 | Cache freshness: a new poem shows everywhere on the next request | author-poems, poem-management |
| FR-13 | Loading skeletons on the three new pages | poem-management |
| FR-14 | Local seed creates poem rows (0 to 4 per seeded author) | author-profiles |
| NFR-1 | Database integrity under direct API calls (RLS, column grants, checks, bucket policies) | poem-management |
| NFR-2 | Server-rendered pages; only the form and the notification are client code | poem-management |
| NFR-3 | Module boundaries: new feature, one-way imports, shared building blocks | poem-management |
| NFR-4 | One cache scope per author read, one tag per author | author-poems |
| NFR-5 | Safe Markdown: the profile about's allowlist | author-poems |
| NFR-6 | Design tokens only | poem-management |
| NFR-7 | Accessible form, pages, and notification | poem-management |
| NFR-8 | Russian UI copy verbatim | poem-management |
| NFR-9 | Build without env; rendering modes | poem-management |
| NFR-10 | Logs carry no poem title, text, or file content | poem-management |

## Impact

- **Database**: new migration — `public.poems` table with RLS and select-only column grants,
  `create_my_poem` and `can_create_poem` functions (the only write path, with the limit inside),
  one `is_public_author_profile` function that the `author_profiles` public policy now uses too,
  a `poem-illustrations` public bucket with owner-folder policies. `supabase/seed.sql` and `supabase/config.toml`
  (bucket) change; new pgTAP test `supabase/tests/poems.test.sql`.
- **Contentful**: a new read of the `tag` collection (`GetPoetryGenres`), through the existing
  `shared/lib/contentful` client.
- **Code**: new `src/features/poem-management/`; `src/features/poems/` (DAL from the database,
  genres DAL, views); `src/features/authors/` (links, moved building blocks); `src/features/breadcrumbs/`;
  `src/shared/` (Markdown editor and renderer, image file check and picker, the Supabase error classifier, the
  management path constant); new routes under `src/app/(authorized)/account/poems/` and
  `src/app/@breadcrumbs/account/poems/`.
- **Tests**: unit and component tests per feature; recorded web-qa scenarios that relied on mock
  poems and their illustrations are updated.
- **Docs**: `docs/architecture.md`, `docs/state-management.md`.
- **Deploy**: `npx supabase db push` for the new migration, the `poem-illustrations` bucket on
  the hosted project, and the Contentful `tag` content type with its entries in each environment
  (added to the deploy checklist in `PROGRESS.md`).
- **Decisions**: a new ADR for the poem write limit counted from stored rows inside the create
  function (a variant of ADR 0007).
