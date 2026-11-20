## Why

Today every page of the site has the same title and description (the root layout's `siteConfig`), no canonical URL, no Open Graph or Twitter card, no `robots.txt` and no `sitemap.xml`. A poem or an author page shared in Telegram, VK or WhatsApp shows the site name and one generic line, and search engines see nothing that tells one poem from another. The poems, authors and collections are public by design and are the whole value of the site, so they should be found and shared well. The signed-in pages (`/account`, `/admin`) must stay out of search results and link previews.

## What Changes

- A site-wide title template and, for each public page, its own title, description, canonical URL, Open Graph and Twitter card (poem, author, collection, authors directory, home, about, privacy). Login and sign-up get no card: a title, a canonical and `noindex, follow` only.
- A share image per page: the poem's illustration, else the author's photo on the author page, else one default site image.
- Signed-in pages (`/account/**`, `/admin/**`) and the two auth pages, `/login` and `/signup` (exactly these two; `/auth/confirm` is a redirecting route handler, and a future auth page decides its own metadata), get `noindex`; the signed-in pages get no description and no social card, only a plain tab title. See "Research: signed-in pages" below.
- `robots.txt` (allow the public pages, disallow `/account`, `/auth`, `/api`, point to the sitemap; `/admin` is deliberately not listed, see "Research: is robots.txt needed?") and `sitemap.xml` (home, directory, about, privacy, every public author, poem and non-empty collection).
- A missing or removed poem, author or collection is marked `noindex` for a crawler. Today the page's `notFound()` runs inside a streamed boundary, so the status is 200 with a «not found» screen (a soft 404 that search engines may index or keep). The spike (task 1.2) found that the metadata step cannot change the status on these prerendered pages, so the change adds `noindex` through `notFound()` in the metadata step and leaves the real 404 status as a follow-up (owner decision, 2026-11-20).
- One new setting, `SITE_URL`, the site's public address (the base of every absolute URL in tags and in the sitemap).
- Social crawlers must get the tags in the first HTML response: a check per crawler, and `htmlLimitedBots` in `next.config.ts` for any that Next's default list misses.
- No schema change, no new dependency, no client JavaScript.

## Research: signed-in pages

**Finding: no description and no social card; add `noindex` and a plain title.**

- A signed-out request to `/account/**` is redirected by the proxy to `/login` before anything renders, and `/admin/**` shows the soft 404 to a non-admin. A crawler or a messenger's preview bot therefore never sees the page, only `/login`. Search snippets and link cards for these pages cannot exist, so writing them is wasted work.
- A signed-in reader who opens the page does see its `<head>`. A `noindex, nofollow` there is cheap insurance in case a URL ever leaks (a shared screenshot, a copied link), and costs one static `robots` field on the `(authorized)` group layout.
- A plain tab title helps the reader who keeps several tabs open; it is a usability gain, not SEO, so it stays minimal (one static title for the `(authorized)` group, which the two admin pages inherit so that a non-admin's tab does not reveal the page; no per-page copy).
- `robots.txt` disallows `/account` (and `/auth`, `/api`), to keep crawlers from spending requests on redirects. It leaves `/admin` out on purpose: the file is public, a non-admin already gets the not-found screen there (which Next marks `noindex`), and listing the path would only announce it.
- The same reasoning gives `noindex` (with `follow`) to `/login` and `/signup`: thin pages, and `/login?error=…` makes many URLs of one page.

## Research: is a sitemap needed?

**Finding: not needed for discovery today; worth keeping for three smaller reasons, as the last and separable part of the change.**

- Discovery works without it. The header links «Наши авторы» (`/authors`), the directory lists every public author (no pagination), an author page lists all their collections and poems, and each poem links on. Every public page is at most three clicks from `/`, so a crawler that follows links finds all of them. A sitemap matters most for sites where pages are orphaned or very deep; this one is neither.
- What it still gives: (1) new poems are picked up sooner, since users add poems all the time and a crawler revisits a sitemap more often than it re-walks the whole link graph; (2) Google Search Console and Yandex Webmaster report «submitted» against «indexed» per URL, which is the practical way to see whether removed content really drops out (the `noindex` work in this change) and whether any page is skipped; (3) it keeps working if the directory is ever paginated.
- What it does not give here: no `lastmod` (poems have no `updated_at`), and Google ignores `priority` and `changefreq`. So the main freshness signal a sitemap can carry is absent until a later migration.
- What it costs: the largest part of the change: a new `features/seo` feature, a paginated read of every public poem under Supabase's 1000-row cap, a cache entry that grows with the catalogue, a request-time route, and stale URLs for up to hours after a deletion or ban.
- Decision (owner, 2026-11-20): keep it in this change, as group 5's sitemap tasks, because the cost is a one-off and the Search Console report is useful from day one. It stays separable on purpose: `robots.txt`, `htmlLimitedBots`, titles, descriptions and cards do not depend on it, so if it ever has to be dropped, tasks 5.1, 5.2 and 5.4 are the ones to remove.

## Research: is robots.txt needed?

**Finding: optional, but almost free, so keep it, in a minimal form.**

- Without the file crawlers assume everything is allowed, so nothing breaks. It is a static file of about ten lines with no data behind it.
- What it gives: the `Sitemap:` line (the dependable way to announce the sitemap, if the sitemap stays); no «robots.txt not found» warning in Google Search Console and Yandex Webmaster; fewer wasted requests to `/account`, `/auth` and `/api`.
- What it does not give: protection. `Disallow` only asks a crawler not to read a URL; it does not remove a URL from the index and it hides the `noindex` tag from the crawler. The private pages are safe because of the session check and `noindex`, not because of this file.
- The one thing to avoid: `/admin` in `Disallow`. The file is public, so it would point at the admin page's address for no benefit (a non-admin already gets the not-found screen there). So `/admin` is left out.

## Proposed improvements beyond the two asked points

In this change (small, and they make the first two points work):

1. Canonical URLs: one address per page, with no `?error=` or tracking query.
2. `robots.txt` and `sitemap.xml`: the only way a search engine learns about new poems and authors without waiting for links.
3. Description built from the page's own text (the poem's first lines, the author's «О себе»), not one fixed sentence.
4. `og:locale=ru_RU`, `og:type` per page (`article` for a poem, `profile` for an author), and `lang="ru"` already set.
5. A Telegram, VK and WhatsApp preview check (the audience is Russian-speaking; Next's default bot list is not guaranteed to include them).
6. Real 404 status for removed content (see What Changes): an admin deletion or a ban should drop the URL from search results, not leave a 200 page that says «not found». It needs these pages to be fully dynamic (no prerendered shell), so it is a design of its own; `noindex` covers the gap meanwhile.

Left for later changes, each recorded here so it is not lost:

- JSON-LD (`Person`, `CreativeWork`, `BreadcrumbList`): the trail already exists in the UI. No rich result exists for poems, so the gain is small until the basics are indexed.
- A generated card per poem (title and first lines on an image): the most shareable thing a poetry site can add, but it needs a Cyrillic font file in the repo and a design.
- `sitemap` `lastmod`: poems have no `updated_at` column, so it needs a migration; a wrong `lastmod` is ignored or penalised, so it is omitted for now.
- Favicon set, `apple-touch-icon` and a web manifest (only `favicon.ico` exists).
- Search Console and Yandex Webmaster verification tags, and an RSS feed of new poems.
- Sitemap sharding with `generateSitemaps` once the public poems approach the 50 000-URL limit.

## Capabilities

### New Capabilities

- `page-metadata`: titles, descriptions, canonical URLs, Open Graph and Twitter cards for the public pages, the share image choice, and `noindex` for the signed-in and auth pages.
- `crawler-discovery`: `robots.txt`, `sitemap.xml`, the `SITE_URL` setting, and the social crawlers' access to the tags.

### Modified Capabilities

<!-- None: no existing capability's requirements change; the new behaviour is additive. -->

## Open Questions

- specs/crawler-discovery/spec.md:4 — which address is the production site, a custom domain or the `*.vercel.app` one: unknown until the first deploy, so it does not block implementation; the code falls back to Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000`, and the owner sets `SITE_URL` only if the final address differs (a custom domain) — owner: the owner, due: 2026-12-04 (one week after the planned first deploy; move it if the deploy slips)

## Impact

- New: `src/shared/lib/seo/` (pure builders: title, description excerpt, canonical, Open Graph and Twitter fields, `noindex`, site URL), `src/features/seo/` (the robots rules and the sitemap's entries, composed from the public APIs of `authors`, `poems` and `collections` (its path function only); `authors` also exports `listPublicAuthors` from its index), `src/app/robots.ts`, `src/app/sitemap.ts`, `public/og-default.png`.
- Changed: `src/app/layout.tsx` (metadata base, title template, default card); `generateMetadata` on the public route files, backed by one metadata function per feature (`poems`, `authors`, `collections`, `content-page`) exported through its index; `(authorized)` layout and the two admin pages (static `robots` and title); `login` and `sign-up` pages; `poems` gets one new read (the public poem references for the sitemap, paginated under Supabase's 1000-row cap); `next.config.ts` only if the crawler check finds a gap; `docs/environment.md` (`SITE_URL`, deploy checklist), `docs/architecture.md`.
- Specs: two new, `page-metadata` and `crawler-discovery`.
- Risks: metadata that reads runtime data (`params`) under Cache Components must share the page's cached reads, or it adds a database call per request and can raise a build error; a metadata failure must never turn a working page into an error page; the sitemap is cached, so a deleted or banned author's URLs stay in it for at most the cache lifetime while the pages themselves are marked `noindex` at once.
