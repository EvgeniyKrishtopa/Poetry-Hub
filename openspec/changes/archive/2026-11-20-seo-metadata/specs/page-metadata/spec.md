## ADDED Requirements

### Requirement: Site title template and per-page titles (FR-1)
The site SHALL set a title template in the root layout, so a page title is rendered as `<page title> | Поэтический Хаб`, and the home page title is the site name alone. Each public page SHALL set its own title: the poem page `<poem title> — <author full name>`, the author page `<author full name>`, the collection page `<collection title> — <author full name>`, the authors directory «Наши авторы», and the about and privacy pages the title of their Contentful entry. A title that cannot be built, because the metadata code itself fails (an exception in it) or because the page's read failed (`unavailable`), SHALL fall back to the site name; in the failed-read case the page body still throws to its error screen as it does today (spike 1.2: an error thrown from the metadata step shows the not-found screen instead of `error.tsx`, so it is not thrown there).

#### Scenario: Poem page title
- **GIVEN** a public poem «Осень» by the public author «Анна Иванова»
- **WHEN** a crawler requests the poem page
- **THEN** the document title is «Осень — Анна Иванова | Поэтический Хаб»

#### Scenario: Home page title
- **GIVEN** the application is running
- **WHEN** a crawler requests `/`
- **THEN** the document title is «Поэтический Хаб», without the template suffix

#### Scenario: Content page title comes from its entry
- **GIVEN** the Contentful `about_page` entry has the title «О проекте»
- **WHEN** a crawler requests `/about`
- **THEN** the document title is «О проекте | Поэтический Хаб»

#### Scenario: A failure in the metadata code falls back to the site name
- **GIVEN** the description builder throws for a public poem
- **WHEN** the page's metadata is built
- **THEN** the title is «Поэтический Хаб» and the poem page still renders

### Requirement: Description from the page's own text (FR-2)
Each public page SHALL carry a `description` meta tag built from its own public text: the poem page from the poem's text, the author page from the author's «О себе» text, the collection page from the collection's description, and the home page, the authors directory, the about page and the privacy page each from its own fixed sentence (one sentence per page, a named constant, no two pages sharing one). When the source text is empty, the page SHALL use a fixed sentence that names the author (author page) or both the collection and its author (collection page). The description SHALL follow NFR-4.

#### Scenario: Poem description is the first lines
- **GIVEN** a public poem whose text begins with two stanzas of plain verse
- **WHEN** the poem page's metadata is built
- **THEN** the description is the poem's first lines as plain text, with no Markdown syntax

#### Scenario: Author without an «О себе» text
- **GIVEN** a public author with no «О себе» text
- **WHEN** the author page's metadata is built
- **THEN** the description is a fixed sentence that names the author, such as «Стихи автора Анны Ивановой на Поэтическом Хабе.»

#### Scenario: Collection without a description
- **GIVEN** a public collection «Осень» by «Анна Иванова» with no description
- **WHEN** the collection page's metadata is built
- **THEN** the description is a fixed sentence naming both, such as «Сборник «Осень» автора Анны Ивановой на Поэтическом Хабе.»

#### Scenario: Collection with a description
- **GIVEN** a public collection with a description
- **WHEN** the collection page's metadata is built
- **THEN** the description is that text, shortened per NFR-4

### Requirement: Canonical URL (FR-3)
Each public page SHALL declare an absolute canonical URL built from `SITE_URL` and the page's own path, with no query string and no hash. A page opened with a different spelling of the same address (an uppercase UUID, a `?error=…` query) SHALL still declare the one canonical address, with lowercase ids.

#### Scenario: Query is dropped
- **GIVEN** `SITE_URL` is `https://example.org`
- **WHEN** a crawler requests `/login?error=confirm-failed`
- **THEN** the canonical URL is `https://example.org/login`

#### Scenario: Uppercase id in the request
- **GIVEN** `SITE_URL` is `https://example.org` and the author page also opens for an uppercase spelling of the author's id
- **WHEN** a crawler requests `/authors/<UPPERCASE-ID>`
- **THEN** the canonical URL is `https://example.org/authors/<lowercase-id>`

#### Scenario: Canonical of a poem page
- **GIVEN** `SITE_URL` is `https://example.org` and a public poem with id `P` by the author with id `A`
- **WHEN** a crawler requests the poem page
- **THEN** the canonical URL is `https://example.org/authors/A/poems/P`

### Requirement: Open Graph and Twitter cards (FR-4)
Each public page SHALL carry Open Graph tags (`og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale` set to `ru_RU`, `og:type`, `og:image`) and Twitter card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`). `og:type` SHALL be `article` on a poem page, `profile` on an author page and `website` elsewhere. `og:title`, `og:description` and `og:url` SHALL equal the page's title (without the template suffix), description and canonical URL. `twitter:card` SHALL be `summary_large_image`.

#### Scenario: Poem page card
- **GIVEN** a public poem page
- **WHEN** a messenger's preview bot requests it
- **THEN** the HTML carries `og:type` `article`, `og:locale` `ru_RU`, `og:title` equal to the poem title and author, and `twitter:card` `summary_large_image`

#### Scenario: Author page card
- **GIVEN** a public author page
- **WHEN** a messenger's preview bot requests it
- **THEN** the HTML carries `og:type` `profile` and an `og:url` equal to the canonical URL

### Requirement: Share image choice (FR-5)
The share image (`og:image` and `twitter:image`) SHALL be the poem's illustration on a poem page that has one, the author's photo on the author page of an author who has one, and otherwise the default site image `/og-default.png`, as an absolute URL. A page whose illustration or photo is absent SHALL NOT carry a broken or empty image tag.

#### Scenario: Poem with an illustration
- **GIVEN** a public poem with an illustration
- **WHEN** the poem page's metadata is built
- **THEN** `og:image` is the illustration's public URL

#### Scenario: Poem without an illustration
- **GIVEN** a public poem with no illustration
- **WHEN** the poem page's metadata is built
- **THEN** `og:image` is `<SITE_URL>/og-default.png`

#### Scenario: Collection page uses the default image
- **GIVEN** a public collection page
- **WHEN** its metadata is built
- **THEN** `og:image` is `<SITE_URL>/og-default.png`

### Requirement: Signed-in pages are not indexed and carry no card (FR-6)
Every page under `/account` and `/admin` SHALL declare `robots` `noindex, nofollow`, a plain static title, and SHALL NOT carry a description, an Open Graph tag or a Twitter card.

#### Scenario: Account page head
- **GIVEN** a signed-in reader
- **WHEN** they open `/account`
- **THEN** the HTML has `<meta name="robots" content="noindex, nofollow">`, a title, and no `description`, `og:` or `twitter:` tag

#### Scenario: Admin page head
- **GIVEN** a signed-in admin
- **WHEN** they open `/admin/violations`
- **THEN** the HTML has `noindex, nofollow` and no `description`, `og:` or `twitter:` tag

### Requirement: Auth pages are not indexed (FR-7)
`/login` and `/signup` SHALL declare `robots` `noindex, follow`, a plain title and their canonical URL (FR-3), and SHALL NOT carry a description, an Open Graph tag or a Twitter card; they are the two exceptions to FR-2, FR-4 and FR-5.

#### Scenario: Login page head
- **GIVEN** the application is running
- **WHEN** a crawler requests `/login`
- **THEN** the HTML has `<meta name="robots" content="noindex, follow">`, a canonical link `<SITE_URL>/login`, and no `description`, `og:` or `twitter:` tag

### Requirement: Missing content is marked noindex for a crawler (FR-10)
A request for a poem, author or collection page that does not exist, is not public, or was removed, or for `/about` or `/privacy` whose Contentful entry does not exist, SHALL carry `<meta name="robots" content="noindex">` and show the not-found screen, because the metadata step calls `notFound()` for it. The HTTP status stays 200: spike 1.2 measured 200 for every crawler, in and out of `htmlLimitedBots`, since these pages' prerendered shell commits the status before the metadata resolves (Cache Components). A real 404 status is a recorded follow-up (proposal). A failed read (`unavailable`) SHALL NOT be reported as not found: the metadata step returns the site's fallback metadata and the page body throws to its error screen as it does today. An unexpected exception in the metadata code itself SHALL NOT break the page (FR-1).

#### Scenario: Removed poem
- **GIVEN** an admin has deleted a poem
- **WHEN** a crawler requests that poem's page
- **THEN** the HTML has `<meta name="robots" content="noindex">` and the not-found screen

#### Scenario: Unknown author id
- **GIVEN** an id that is a valid UUID but belongs to no public author
- **WHEN** a crawler requests `/authors/<id>`
- **THEN** the HTML has `<meta name="robots" content="noindex">` and the not-found screen

#### Scenario: Missing content entry
- **GIVEN** the Contentful `about_page` entry does not exist
- **WHEN** a crawler requests `/about`
- **THEN** the HTML has `<meta name="robots" content="noindex">` (the page body's own screen for a browser is unchanged)

#### Scenario: Read failure is not marked as missing
- **GIVEN** the authors read fails
- **WHEN** a crawler requests a public author page
- **THEN** the metadata is the site's fallback (no `noindex` from the metadata step) and the page shows its error screen

### Requirement: Descriptions are plain text of bounded length (NFR-4)
A description SHALL be plain text: Markdown syntax (headings, emphasis, list and quote markers, the poem formats for epigraph, separator and indent) removed, runs of whitespace and line breaks collapsed to one space, at most 160 characters, cut at a word boundary with `…` appended when shortened; when the text has no space to cut at within the limit, it SHALL be cut hard so that the result with `…` is exactly 160 characters. A text that is empty after cleaning counts as empty (FR-2).

#### Scenario: Markdown is stripped
- **GIVEN** a text `**Осень** пришла.\n\n> тихо`
- **WHEN** the description is built
- **THEN** the result is `Осень пришла. тихо`

#### Scenario: Long text is shortened at a word
- **GIVEN** a text of 400 characters made of words
- **WHEN** the description is built
- **THEN** the result is at most 160 characters, ends with `…`, and does not end in the middle of a word

#### Scenario: A text with no space is cut hard
- **GIVEN** a text of 400 characters with no space
- **WHEN** the description is built
- **THEN** the result is 159 characters of the text followed by `…`, 160 characters in all

### Requirement: Metadata reuses the page's reads (NFR-1)
Building a page's metadata SHALL use the same cached reads as the page itself (the per-request memoized `getPublicAuthor`, `getAuthorPoem`, `getPublicCollection`, the content page read), so a page request makes no additional database or Contentful call because of its metadata.

#### Scenario: One read per request
- **GIVEN** a poem page request
- **WHEN** both the metadata and the page body read the poem
- **THEN** the poems read runs once for that request

### Requirement: No private data in metadata (NFR-2)
Metadata SHALL be built only from public fields. It SHALL NOT contain a user id, an email address, a session value, or text of a poem that is not public.

#### Scenario: Public fields only
- **GIVEN** any public page
- **WHEN** its metadata is built
- **THEN** every value comes from the public author, poem, collection or content entry the page shows

### Requirement: Server-only, no client script (NFR-3)
The metadata code SHALL run on the server and SHALL NOT add client JavaScript to any page.

#### Scenario: No client import
- **GIVEN** the metadata modules under `shared/lib/seo` and the features
- **WHEN** the production build bundles the client
- **THEN** none of them appears in a client bundle
