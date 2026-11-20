## ADDED Requirements

### Requirement: Site URL setting (FR-11)
The site's public address SHALL come from the server-side setting `SITE_URL`: any absolute `http` or `https` URL is accepted and reduced to its origin (a path, a trailing slash, a query or a hash is dropped). When it is not set, the code SHALL use `https://` plus Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, and when that is not set either, `http://localhost:3000`. A value that is not an absolute `http` or `https` URL SHALL be ignored with one logged line per server process (later reads stay silent), and the next fallback used. The same check and reduction apply to the Vercel value after `https://` is prepended. The resulting URL SHALL be the base of every absolute URL in metadata, `robots.txt` and the sitemap.

#### Scenario: Explicit setting wins
- **GIVEN** `SITE_URL` is `https://example.org` and `VERCEL_PROJECT_PRODUCTION_URL` is `poetry.vercel.app`
- **WHEN** the site URL is read
- **THEN** it is `https://example.org`

#### Scenario: Vercel fallback
- **GIVEN** `SITE_URL` is not set and `VERCEL_PROJECT_PRODUCTION_URL` is `poetry.vercel.app`
- **WHEN** the site URL is read
- **THEN** it is `https://poetry.vercel.app`

#### Scenario: Local fallback
- **GIVEN** neither variable is set
- **WHEN** the site URL is read
- **THEN** it is `http://localhost:3000`

#### Scenario: Path and trailing slash are dropped
- **GIVEN** `SITE_URL` is `https://example.org/blog/`
- **WHEN** the site URL is read
- **THEN** it is `https://example.org`

#### Scenario: Invalid value is ignored
- **GIVEN** `SITE_URL` is `not a url`
- **WHEN** the site URL is read
- **THEN** one line is logged and the next fallback is used

### Requirement: robots.txt (FR-8)
The site SHALL serve `/robots.txt` that allows crawling of the public pages, disallows `/account`, `/auth` and `/api`, and names the sitemap with an absolute URL (`Sitemap: <SITE_URL>/sitemap.xml`). It SHALL NOT list `/admin`: the file is public, and naming the path would announce a page that answers a non-admin with the not-found screen.

#### Scenario: Robots content
- **GIVEN** `SITE_URL` is `https://example.org`
- **WHEN** a crawler requests `/robots.txt`
- **THEN** the response has `Disallow` lines for `/account`, `/auth` and `/api` and none for `/admin`, an `Allow: /` rule, and `Sitemap: https://example.org/sitemap.xml`

#### Scenario: The response is not redirected or gated
- **GIVEN** a signed-out request
- **WHEN** it asks for `/robots.txt`
- **THEN** the response is 200 and not a redirect to `/login`

### Requirement: sitemap.xml (FR-9)
The site SHALL serve `/sitemap.xml` listing, as absolute URLs: the home page, the authors directory, the about page, the privacy page, every public author's page, every public poem's page, and every public collection that holds at least one poem. It SHALL NOT list any page under `/account`, `/admin`, `/login`, `/signup` or `/auth`, an author who is not public, or an empty collection. It SHALL read every public poem even when the database caps a response at 1000 rows.

#### Scenario: Public content is listed
- **GIVEN** a public author `A` with a poem `P` in the collection `C`
- **WHEN** a crawler requests `/sitemap.xml`
- **THEN** it lists `/authors/A`, `/authors/A/poems/P` and `/authors/A/collections/C` under `SITE_URL`

#### Scenario: Empty collection is left out
- **GIVEN** a collection of a public author that holds no poem
- **WHEN** a crawler requests `/sitemap.xml`
- **THEN** that collection's page is not listed

#### Scenario: Poems of an author missing from the authors list are left out
- **GIVEN** the poems read still returns poems of an author who is no longer in the public authors list
- **WHEN** a crawler requests `/sitemap.xml`
- **THEN** none of that author's poem or collection pages is listed

#### Scenario: Private pages are never listed
- **GIVEN** any state of the database
- **WHEN** a crawler requests `/sitemap.xml`
- **THEN** no listed URL starts with `/account`, `/admin`, `/login`, `/signup` or `/auth`

#### Scenario: More than 1000 poems
- **GIVEN** 2500 public poems
- **WHEN** a crawler requests `/sitemap.xml`
- **THEN** all 2500 poem pages are listed

#### Scenario: A failed read does not serve a partial sitemap as complete
- **GIVEN** the poems read fails
- **WHEN** a crawler requests `/sitemap.xml`
- **THEN** the response is an error status (not 200 with only the static pages), so the crawler retries later

### Requirement: Social crawlers receive the tags in the first response (NFR-6)
For each of Googlebot, Yandex, Bingbot, Telegram, VK, WhatsApp, Facebook, X and Slack previews, the HTML of a public page SHALL contain the title, description, canonical, Open Graph and Twitter tags in its initial response, not only after streaming. A crawler Next's default list does not cover SHALL be added through `htmlLimitedBots` in `next.config.ts`, whose value SHALL be the full default pattern plus the additions, since setting it replaces the default.

#### Scenario: Preview bot gets the tags
- **GIVEN** a public poem page
- **WHEN** it is requested with the user agent of each crawler above
- **THEN** each response's `<head>` holds `og:title`, `og:description`, `og:image` and the canonical link

### Requirement: Sitemap freshness (NFR-5)
The sitemap SHALL be cached with a bounded lifetime (hours). Content removed after a cache fill MAY stay listed until the entry expires; the page itself SHALL answer FR-10 at once.

#### Scenario: Deleted poem still listed briefly
- **GIVEN** a poem was deleted after the sitemap was cached
- **WHEN** a crawler follows the sitemap's URL to that poem
- **THEN** the response status is 404 (FR-10)
