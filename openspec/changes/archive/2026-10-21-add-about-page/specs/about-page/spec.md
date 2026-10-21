## ADDED Requirements

### Requirement: About page content from Contentful (FR-1)
The application SHALL serve a public page at `/about` that shows the Contentful `greeting` entry with key `about_page`: its `title`, trimmed, as the page's only level-1 heading, followed by its `message`, trimmed, as paragraphs in order. One or more blank lines (a line holding only whitespace counts as blank) SHALL separate paragraphs; a single line break inside a paragraph SHALL be kept as a line break. The text SHALL render as plain text, never parsed as Markdown or HTML (NFR-3).

#### Scenario: Title and paragraphs
- **GIVEN** Contentful returns the `about_page` entry with title `  О проекте  ` and message `Первый абзац.\nВторая строка.\n\n  \nВторой абзац.`
- **WHEN** `/about` is rendered
- **THEN** the only level-1 heading reads `О проекте`
- **AND** the content holds exactly two paragraphs: `Первый абзац.` + line break + `Вторая строка.`, then `Второй абзац.`

#### Scenario: Markup stays text
- **GIVEN** the message holds `<b>жирный</b>` and `**жирный**`
- **WHEN** `/about` is rendered
- **THEN** the paragraph text contains those characters literally
- **AND** the content has no `<b>` or `<strong>` element

### Requirement: Error screen when the content can't be shown (FR-2)
When the `about_page` entry can't be shown, `/about` SHALL show the app's error screen (heading «Что-то пошло не так», button «Повторить») in place of the page content, with the header, the breadcrumb trail, and the footer present and no text from Contentful. This SHALL apply to every failure reason: `config`, `network`, `auth`, `graphql`, `http`, `validation` (a missing field, or an empty or whitespace-only `title` or `message`), and `not-found` (no entry with that key). Each failed read (a call that misses the cache and fails) SHALL write exactly one server log line holding the reason and, for `auth` and `http` only, the HTTP status, and nothing else.

#### Scenario: Any failure reason
- **GIVEN** the about data access returns a failure with any of the reasons above
- **WHEN** the about content renders
- **THEN** it throws an error whose message holds neither the reason nor any Contentful data
- **AND** the nearest error boundary shows «Что-то пошло не так» and «Повторить»

#### Scenario: Invalid access token in a browser
- **GIVEN** the app runs with an invalid Contentful access token
- **WHEN** a browser opens `/about`
- **THEN** «Что-то пошло не так» and «Повторить» are shown, with the header, the trail «Главная › О проекте», and the footer present
- **AND** every `[contentful] about page failed` line logged carries reason `auth` and status 401 and nothing else (reloads and retries may add more lines, one per failed read)
- **AND** no log line contains the token

### Requirement: Fresh content after a publish (FR-3)
After `POST /api/revalidate` accepts a Contentful publish notification, the next request to `/about` SHALL show the published `title` and `message`. Without a notification, a published change SHALL show within 3 minutes of publishing; the first reload after the cache lifetime may still serve the previous text once while it refreshes.

#### Scenario: Publish notification
- **GIVEN** `/about` was rendered and cached with title A, and the entry's title has since been changed to B and published
- **WHEN** a valid notification is accepted by `/api/revalidate` and then `/about` is requested
- **THEN** that request shows title B

#### Scenario: No notification
- **GIVEN** `/about` was rendered and cached with title A, and the entry's title has since been changed to B and published, with no notification sent
- **WHEN** `/about` is reloaded twice, at least 3 minutes after publishing
- **THEN** the second reload shows title B

### Requirement: Server-only rendering and caching (NFR-1, NFR-2)
The about page SHALL be rendered on the server only: no file in the about feature has `"use client"`, its data access module is server-only, and the browser SHALL make no request to Contentful. The about data access SHALL own a cache scope tagged `CONTENTFUL_CACHE_TAG`, with the `"minutes"` lifetime for a successful read and `"seconds"` for a failure, so that `npm run build` succeeds with no Contentful variables set and does not mark `/about` as fully dynamic.

#### Scenario: No Contentful request from the browser
- **GIVEN** a browser opens `/about`
- **WHEN** its network requests are listed
- **THEN** none goes to a `contentful.com` host

#### Scenario: Build without Contentful settings
- **GIVEN** no `CONTENTFUL_*` variable is set
- **WHEN** `npm run build` runs
- **THEN** it succeeds and the route table does not mark `/about` as `ƒ`

#### Scenario: Lifetime follows the result
- **GIVEN** the read succeeds, or fails
- **WHEN** the data access's cache scope closes
- **THEN** `cacheTag` was called with `CONTENTFUL_CACHE_TAG`, and `cacheLife` with `"minutes"` on success or `"seconds"` on failure
