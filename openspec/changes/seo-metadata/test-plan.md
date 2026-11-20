# Test plan: seo-metadata

One row per Then of a scenario in `specs/page-metadata/spec.md` and `specs/crawler-discovery/spec.md`. Levels: unit (pure function or one component/route function with its reads mocked), integration (a real route handler or the built app answering HTTP, with a real or fake Supabase), end-to-end (a real browser or a crawler user agent against the production build). Rows marked "recorded" are checked against `npm run build && npm run start` and the result is written under the named task in `tasks.md`, because the status and streaming behaviour they cover only exists in a production build.

| Requirement | Tests | Level |
| --- | --- | --- |
| FR-1: Poem page title is «Осень — Анна Иванова \| Поэтический Хаб» | `poems/tests/metadata/poem-page-metadata.test.ts`: ok result gives the title `<poem> — <author>` | unit |
| FR-1: Home page title is the site name without the suffix | `app/tests/metadata-public-pages.test.ts`: home `metadata.title.absolute` equals the site name | unit |
| FR-1: Content page title comes from its entry | `content-page/tests/metadata/content-page-metadata.test.ts`: entry title becomes the page title | unit |
| FR-1: A failure in the metadata code falls back to the site name | `poems/tests/metadata/poem-page-metadata.test.ts`: a throwing description builder returns `FALLBACK_METADATA` and does not throw | unit |
| FR-2: Poem description is the first lines as plain text | `poems/tests/metadata/poem-page-metadata.test.ts`: a two-stanza text gives its first lines with no Markdown | unit |
| FR-2: Author without «О себе» gets the fixed sentence naming the author | `authors/tests/metadata/author-page-metadata.test.ts`: null `about` gives the sentence with the full name | unit |
| FR-2: Collection without a description names both collection and author | `collections/tests/metadata/collection-page-metadata.test.ts`: empty description gives the sentence naming both | unit |
| FR-2: Collection with a description uses it, shortened | `collections/tests/metadata/collection-page-metadata.test.ts`: a long description is shortened per NFR-4 | unit |
| FR-2: Home, directory, about and privacy each have their own sentence | `app/tests/metadata-public-pages.test.ts`: the four descriptions are pairwise different and none is empty | unit |
| FR-3: Query is dropped from the canonical | `shared/lib/seo/tests/page-metadata.test.ts`: a path with `?error=…` gives `<SITE_URL>/login`; `app/tests/metadata-public-pages.test.ts`: login canonical | unit |
| FR-3: An uppercase id gives a lowercase canonical | `authors/tests/metadata/author-page-metadata.test.ts`: uppercase `params` id gives the lowercase id in the canonical and `og:url` | unit |
| FR-3: Canonical of a poem page is `/authors/A/poems/P` | `poems/tests/metadata/poem-page-metadata.test.ts`: canonical equals `<SITE_URL>/authors/A/poems/P` | unit |
| FR-4: Poem page carries the card (`article`, `ru_RU`, `og:title`, `summary_large_image`) | `shared/lib/seo/tests/page-metadata.test.ts`: `buildPageMetadata` with type `article` sets every Open Graph and Twitter field; `poems/tests/metadata/poem-page-metadata.test.ts`: the poem result carries them | unit |
| FR-4: Author page card has `og:type` `profile` and `og:url` equal to the canonical | `authors/tests/metadata/author-page-metadata.test.ts` | unit |
| FR-5: Poem with an illustration shares the illustration URL | `poems/tests/metadata/poem-page-metadata.test.ts`: `openGraph.images` and `twitter.images` are the illustration URL | unit |
| FR-5: Poem without an illustration shares the default image | `poems/tests/metadata/poem-page-metadata.test.ts`: both image fields resolve to `/og-default.png` | unit |
| FR-5: Collection page shares the default image | `collections/tests/metadata/collection-page-metadata.test.ts` | unit |
| FR-5: The default image file exists and is served | recorded under task 6.3: the file is in `public/` and `/og-default.png` answers 200 signed-out from the built app | end-to-end |
| FR-6: Account page head is `noindex, nofollow` with a title and no description or card | `app/tests/authorized-layout-metadata.test.ts`: the layout's metadata has `robots` `{ index: false, follow: false }`, a title, and no `description`, `openGraph` or `twitter` key | unit |
| FR-6: Admin pages carry the same | `app/tests/authorized-layout-metadata.test.ts`: both admin pages' metadata | unit |
| FR-6: The built signed-in page head has no card tag | recorded under task 3.3: read `/account` and `/admin` HTML for `og:`, `twitter:` and `description` | end-to-end |
| FR-7: Login head is `noindex, follow` with a canonical and no description or card | `app/tests/metadata-public-pages.test.ts`: login and signup metadata | unit |
| FR-10: Removed poem is marked `noindex` with the not-found screen | `poems/tests/metadata/poem-page-metadata.test.ts`: `not-found` result calls `notFound()`; recorded under task 4.4: the production build's HTML for the removed poem has `<meta name="robots" content="noindex">` | unit, end-to-end |
| FR-10: Unknown author id is marked `noindex` | `authors/tests/metadata/author-page-metadata.test.ts`: `not-found` calls `notFound()`; recorded under task 4.4 | unit, end-to-end |
| FR-10: Missing content entry is marked `noindex` | `content-page/tests/metadata/content-page-metadata.test.ts`: `not-found` calls `notFound()` | unit |
| FR-10: A read failure is not reported as not found | `poems/tests/metadata/poem-page-metadata.test.ts`: `unavailable` returns `FALLBACK_METADATA` and never calls `notFound()`; recorded under task 4.4: Supabase stopped shows the error screen, not the not-found screen | unit, end-to-end |
| FR-10: An empty collection is marked `noindex` | `collections/tests/metadata/collection-page-metadata.test.ts`: an empty or foreign collection calls `notFound()`; recorded under task 4.4 | unit, end-to-end |
| NFR-4: Markdown is stripped | `shared/lib/seo/tests/plain-text-excerpt.test.ts`: `**Осень** пришла.\n\n> тихо` gives `Осень пришла. тихо`; table cases for the poem and about formats | unit |
| NFR-4: A long text is shortened at a word | `shared/lib/seo/tests/plain-text-excerpt.test.ts`: 400 characters of words give at most 160 characters, ending in `…`, never mid-word | unit |
| NFR-4: A text with no space is cut hard | `shared/lib/seo/tests/plain-text-excerpt.test.ts`: 400 characters with no space give 159 characters plus `…` | unit |
| NFR-1: One read per request | `poems/tests/metadata/poem-page-metadata.test.ts`: metadata and a simulated page read call the memoized `getAuthorPoem` once (React `cache` mock memo); recorded under task 1.1 for the real pages | unit, end-to-end |
| NFR-2: Only public fields in metadata | `poems/tests/metadata/poem-page-metadata.test.ts` and the author and collection twins: the serialized metadata contains no field outside the mapped public values | unit |
| NFR-3: Metadata modules are server-only and not in a client bundle | each feature's `tests/boundaries.test.ts`: `metadata/` starts with `import "server-only"` and is exported only through the index; recorded under task 4.5: `npm run build` shows no client import | unit, end-to-end |
| FR-11: Explicit `SITE_URL` wins | `shared/lib/seo/tests/site-url.test.ts` | unit |
| FR-11: Vercel fallback | `shared/lib/seo/tests/site-url.test.ts` | unit |
| FR-11: Local fallback | `shared/lib/seo/tests/site-url.test.ts` | unit |
| FR-11: Path and trailing slash are dropped | `shared/lib/seo/tests/site-url.test.ts`: `https://example.org/blog/` gives `https://example.org` | unit |
| FR-11: Invalid value is ignored and logged once per process | `shared/lib/seo/tests/site-url.test.ts`: `not a url` falls back, one log line, a second read stays silent | unit |
| FR-8: Robots content (Disallow `/account`, `/auth`, `/api`; none for `/admin`; Allow `/`; Sitemap line) | `seo/tests/model/robots-rules.test.ts`: the rules object, compared with the path constants, and `/admin` absent; `app/tests/robots.test.ts`: the route returns it | unit |
| FR-8: `/robots.txt` is not redirected or gated | recorded under task 5.3: a signed-out request to the built app answers 200, not a 307 to `/login` | end-to-end |
| FR-9: Public content is listed (author, poem, collection) | `seo/tests/model/sitemap-entries.test.ts`: entries for author A, poem P and collection C under `SITE_URL` | unit |
| FR-9: An empty collection is left out | `seo/tests/model/sitemap-entries.test.ts`: no collection id without a poem gives no entry | unit |
| FR-9: Poems of an unlisted author are left out | `seo/tests/model/sitemap-entries.test.ts`: refs whose author is not in the authors list produce no poem or collection entry | unit |
| FR-9: No private page is ever listed | `seo/tests/model/sitemap-entries.test.ts`: no entry path starts with `/account`, `/admin`, `/login`, `/signup` or `/auth`; recorded under task 5.4 on the built sitemap | unit, end-to-end |
| FR-9: More than 1000 poems are all listed | `poems/tests/dal/public-poem-refs.test.ts`: a fake client with 2500 rows in pages of 1000 yields 2500 refs; a cap lower than 1000 loses none | unit |
| FR-9: A failed read does not serve a partial sitemap | `poems/tests/dal/public-poem-refs.test.ts`: an error on page 2 returns `unavailable`; `seo/tests/dal/sitemap-entries.test.ts`: either read unavailable throws; recorded under task 5.4: the route answers 5xx | unit, end-to-end |
| NFR-5: A deleted poem still in the sitemap answers 404 at its URL | covered by the FR-10 removed-poem rows; the cache lifetime is asserted in `poems/tests/dal/public-poem-refs.test.ts` (`hours` on success, `seconds` on failure) | unit |
| NFR-6: A preview bot gets the tags in the first response | recorded under tasks 1.4 and 5.5: nine crawler user agents against the production build, each response's `<head>` holds `og:title`, `og:description`, `og:image` and the canonical | end-to-end |
| App-level: every public page exports metadata (FR-1) | `app/tests/public-pages-metadata.test.ts` lists the page files under `app/(public)/` and fails for one with neither `metadata` nor `generateMetadata` | unit |
