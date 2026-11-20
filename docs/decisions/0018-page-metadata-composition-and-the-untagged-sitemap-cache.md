# 0018. Page metadata is built per page from shared builders, and the sitemap's cache has no tag

## Status

Accepted (2026-11-20)

## Context

Before `seo-metadata` the root layout exported one static `metadata` object, so every page shared one title and description, and there was no `metadataBase`, `robots.txt`, sitemap or share card. Three facts of Next's metadata shaped the fix (details: `openspec/changes/seo-metadata/design.md`, D1, D2, D5, D8):

- Metadata merges shallowly. A field set on a parent is inherited by every child, the signed-in pages included, and a child's `openGraph` replaces the parent's whole `openGraph` (measured in the spike, task 1.5). A root default would therefore put a card on `/account` and would also feed a stale `description` into a page's card.
- A route file must stay thin (`docs/architecture.md`), yet a title, a description, a canonical link and a card are written the same way on every public page.
- The sitemap spans every author. ADR 0005 says a public read is tagged per entity (`authorWorksTag(authorId)`), and a list of every poem has no single entity to tag.

## Decision

1. **Builders in `shared/lib/seo`, one metadata function per owning feature.** `buildPageMetadata`, `buildNoIndexMetadata`, `FALLBACK_METADATA`, `toCanonicalPath`, `toPlainTextExcerpt` and `getSiteUrl` live in `src/shared/lib/seo/` (server-only, pure). Each feature that owns a public page adds an optional `metadata/` folder (`getPoemPageMetadata`, `getAuthorPageMetadata`, `getPublicCollectionPageMetadata`, `getContentPageMetadata`, and the fixed pages' functions) that reads through the page's own memoized read (ADR 0008) and calls a builder. Route files only forward: `export function generateMetadata(...) { return get…Metadata(...) }`. A central `seo` module that knows poems, authors and collections was rejected: it would hold text rules only the owner features know.
2. **The root layout holds only the base and the title template.** It sets `metadataBase` and `title: { default, template }` and no description. Every public page sets its own full metadata, and a test over `app/(public)/` fails for a page file that exports neither `metadata` nor `generateMetadata`. The `(authorized)` layout sets a no-index group title with no description or card. A layout-level default for public pages was rejected: canonical and `og:url` differ per page and have no sensible default.
3. **The share image is always explicit.** Every `buildPageMetadata` call sets `openGraph.images` and `twitter.images` itself (the poem's illustration, the author's photo, else `/og-default.png`). Next's `opengraph-image` file convention is not used, because how a segment's `openGraph` object interacts with a convention file in a parent segment is not settled in the docs, and an explicit image is testable.
4. **A failed read gives `FALLBACK_METADATA`, never a throw.** The spike (task 1.2, Next 16.4.6) showed an error thrown from `generateMetadata` shows a browser the not-found screen instead of `error.tsx`, which would present a read failure as a missing page. Only a real `not-found` calls `notFound()`; the page body throws to `error.tsx` itself.
5. **The sitemap's poem list is cached by time, with no tag.** `listPublicPoemRefs()` reads `id, author_id, collection_id` in pages of 1000 until a page is empty, in its own `"use cache"` scope with `cacheLife("hours")` on success and `"seconds"` on failure, and carries no `cacheTag`. This departs from ADR 0005's per-entity tags on purpose. The sitemap is composed in `features/seo` from the public APIs of `authors`, `poems` and `collections`, and `app/sitemap.ts` calls `await connection()` first, so it is never prerendered at build and a failed read gives a crawler a 5xx to retry.

## Consequences

**Positive**

- A new public page copies a one-line call to a builder and cannot ship without metadata (the test in point 2).
- Private pages inherit nothing that looks like a card: no description, `og:` or `twitter:` tag.
- Page and metadata share one read per request, so metadata costs no extra query.
- A bug in the metadata code cannot turn a working page into an error page.
- The sitemap never lists a private path, and an env-less CI build still passes.

**Negative**

- A new feature that owns a public page needs a `metadata/` folder and a `generateMetadata` forward in its route file.
- The sitemap can list a deleted or banned author's URLs for up to hours after the change. The pages themselves are marked `noindex` at once, and crawlers handle a stale URL.
- One cache entry holds every public poem's references. It is fine to tens of thousands of poems; the authors read is unpaged (about 1000 authors is the sitemap's ceiling), and there is no `generateSitemaps` split before the 50 000-URL limit. Both are recorded follow-ups, keyed to entry size as well as URL count (a platform limit on one cache item, about 2 MB on Vercel's data cache, is unverified for `"use cache"`).
- A removed poem, an unknown author and an empty collection answer **status 200** with `noindex` and the not-found screen, not 404: the spike measured it for crawlers and browsers alike, most likely because the prerendered shell commits the status before the metadata resolves. A real 404 would need those pages to be fully dynamic and is a proposal follow-up.

## Alternatives Considered

- Defaults in the `(public)` layout with overrides in pages — rejected (point 2): a page that forgot to override would publish a wrong canonical.
- Inline tags in each route file — rejected: it breaks "`app/` is routing only" and repeats the title, card and canonical code in a dozen files.
- One site-wide tag that every `updateTag(authorWorksTag)` call also expires, so the sitemap refreshes at once — rejected: it needs edits in `poem-management`, `collection-management` and `admin` for a list a crawler reads a few times a day.
- One tag per author on the sitemap entry — rejected: it runs into Next's per-entry tag limit.
- Prerender the sitemap at build and revalidate it — rejected: the build would bake in a failure or an empty list, and CI has no database.
- `react-markdown` to turn a poem's text into a description — rejected: it is a renderer of React elements, and a parse and a render per request is too much for a meta string; a small pure function covers the fixed set of Markdown the editors produce.
