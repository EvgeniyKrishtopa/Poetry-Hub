# privacy-policy-page Specification

## Purpose
TBD - created by archiving change add-privacy-policy-page. Update Purpose after archive.
## Requirements
### Requirement: Privacy policy content from Contentful (FR-1)
The application SHALL serve a public page at `/privacy` that shows the Contentful `greeting` entry with key `privacy_policy`: its `title`, trimmed, as the page's only level-1 heading, followed by its `message`, trimmed, as paragraphs in order. One or more blank lines (a line holding only whitespace counts as blank) SHALL separate paragraphs; a single line break inside a paragraph SHALL be kept as a line break. The text SHALL render as plain text, never parsed as Markdown or HTML (NFR-3); the only structure read from it is FR-7's numbered headings.

#### Scenario: Title and paragraphs
- **GIVEN** Contentful returns the `privacy_policy` entry with title `  Политика конфиденциальности  ` and message `Первый абзац.\nВторая строка.\n\n  \nВторой абзац.`
- **WHEN** `/privacy` is rendered
- **THEN** the only level-1 heading reads `Политика конфиденциальности`
- **AND** the content holds exactly two paragraphs: `Первый абзац.` + line break + `Вторая строка.`, then `Второй абзац.`

#### Scenario: Markup stays text
- **GIVEN** the message holds `<b>жирный</b>` and `**жирный**`
- **WHEN** `/privacy` is rendered
- **THEN** the paragraph text contains those characters literally
- **AND** the content has no `<b>` or `<strong>` element

### Requirement: Numbered headings (FR-7)
Within the message, only the first line of each paragraph (FR-1's blank-line split) SHALL be checked for a heading, ignoring its leading whitespace. A first line that starts with `Раздел `, one or more digits, `.` and a space SHALL render as a level-2 heading; one that starts with one or more digits, `.`, one or more digits, `.` and a space SHALL render as a level-3 heading. The heading SHALL hold that line, trimmed, and SHALL be bold; the paragraph's remaining lines, if any, SHALL render right after it as one paragraph, line breaks kept. Every other line SHALL stay paragraph text, including a numbered line that isn't a paragraph's first line, `3.1 ` without the second dot, deeper numbering such as `2.1.3.`, and lines starting with `* `.

#### Scenario: Section and subsection headings
- **GIVEN** the message `Раздел 1. Введение\n\nТекст.\n2.2. Не заголовок\n\n2.1. Данные\n* Пункт\n\n3.1 Без точки\n\n2.1.3. Глубже`
- **WHEN** `/privacy` is rendered
- **THEN** the content holds, in order: a level-2 heading `Раздел 1. Введение`; a paragraph `Текст.` + line break + `2.2. Не заголовок`; a level-3 heading `2.1. Данные`; a paragraph `* Пункт`; a paragraph `3.1 Без точки`; a paragraph `2.1.3. Глубже`
- **AND** both headings are bold, and the content has no other `h2` or `h3`

### Requirement: Error screen when the content can't be shown (FR-2)
When the `privacy_policy` entry can't be shown, `/privacy` SHALL show the app's error screen (heading «Что-то пошло не так», button «Повторить») in place of the page content, with the header, the breadcrumb trail, and the footer present and no text from Contentful. This SHALL apply to every failure reason: `config`, `network`, `auth`, `graphql`, `http`, `validation` (a missing field, or an empty or whitespace-only `title` or `message`), and `not-found` (no entry with that key). Each failed read (a call that misses the content-page DAL's own cache scope and fails, including a failure replayed from `contentfulQuery`'s inner 60 s cache, so one outage may log a line per DAL miss) SHALL write exactly one server log line, `[contentful] content page failed`, holding the entry key, the reason, and, for `auth` and `http` only, the HTTP status, and nothing else.

#### Scenario: Any failure reason
- **GIVEN** the content-page data access returns a failure with any of the reasons above for key `privacy_policy`
- **WHEN** the page content renders
- **THEN** it throws an error whose message holds neither the key, the reason, nor any Contentful data
- **AND** the nearest error boundary shows «Что-то пошло не так» and «Повторить»

#### Scenario: Invalid access token in a browser
- **GIVEN** the app runs with an invalid Contentful access token
- **WHEN** a browser opens `/privacy`
- **THEN** «Что-то пошло не так» and «Повторить» are shown, with the header, the trail «Главная › Политика конфиденциальности», and the footer present
- **AND** every `[contentful] content page failed` line logged for key `privacy_policy` carries reason `auth` and status 401 and nothing else (reloads and retries may add more lines, one per failed read)
- **AND** no log line contains the token

### Requirement: Fresh content after a publish (FR-3)
After `POST /api/revalidate` accepts a Contentful publish notification, the next request to `/privacy` SHALL show the published `title` and `message`. Without a notification, a published change SHALL show within 3 minutes of publishing; the first reload after the cache lifetime may still serve the previous text once while it refreshes.

#### Scenario: Publish notification
- **GIVEN** `/privacy` was rendered and cached with title A, and the entry's title has since been changed to B and published
- **WHEN** a valid notification is accepted by `/api/revalidate` and then `/privacy` is requested
- **THEN** that request shows title B

#### Scenario: No notification
- **GIVEN** `/privacy` was rendered and cached with title A, and the entry's title has since been changed to B and published, with no notification sent
- **WHEN** `/privacy` is reloaded twice, at least 3 minutes after publishing
- **THEN** the second reload shows title B

### Requirement: Server-only rendering and caching (NFR-1, NFR-2)
The privacy page SHALL be rendered on the server only: no file in the content-page feature has `"use client"`, its data access module is server-only, and the browser SHALL make no request to Contentful. The content-page data access SHALL own a cache scope keyed by the entry key and tagged `CONTENTFUL_CACHE_TAG`, with the `"minutes"` lifetime for a successful read and `"seconds"` for a failure, so that `npm run build` succeeds with no Contentful variables set and does not mark `/privacy` as fully dynamic.

#### Scenario: No Contentful request from the browser
- **GIVEN** a browser opens `/privacy`
- **WHEN** its network requests are listed
- **THEN** none goes to a `contentful.com` host

#### Scenario: Build without Contentful settings
- **GIVEN** no `CONTENTFUL_*` variable is set
- **WHEN** `npm run build` runs
- **THEN** it succeeds and the route table does not mark `/privacy` as `ƒ`

#### Scenario: Lifetime follows the result
- **GIVEN** the read for a key succeeds, or fails
- **WHEN** the data access's cache scope closes
- **THEN** `cacheTag` was called with `CONTENTFUL_CACHE_TAG`, and `cacheLife` with `"minutes"` on success or `"seconds"` on failure
- **AND** the key sent to Contentful is the one the data access was called with

