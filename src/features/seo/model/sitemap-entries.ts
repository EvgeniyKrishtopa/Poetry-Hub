import type { MetadataRoute } from "next";

import { AUTHORS_PATH, authorPagePath } from "@/features/authors";
import { publicCollectionPath } from "@/features/collections";
import { authorPoemPath } from "@/features/poems";
import { ABOUT_PATH, HOME_PATH, PRIVACY_PATH } from "@/shared/config/constants";

import type { SitemapPoemRef, SitemapSource } from "./sitemap.types";

/** The pages every visitor can open that hold no data of their own. */
const FIXED_PATHS = [HOME_PATH, AUTHORS_PATH, ABOUT_PATH, PRIVACY_PATH];

/**
 * One entry per distinct collection of a poem, in the order the poems list them. A collection belongs to its
 * poem's author, and a free poem has none, so an empty collection (no poem) never appears.
 */
function distinctCollectionPaths(poems: readonly SitemapPoemRef[]): string[] {
  const paths = new Set<string>();
  for (const poem of poems) {
    if (poem.collectionId !== null) paths.add(publicCollectionPath(poem.authorId, poem.collectionId));
  }
  return [...paths];
}

/**
 * The sitemap's entries (FR-9): the fixed pages, each public author, each poem of a listed author, and each
 * distinct non-null collection per author; absolute URLs; never a private or auth page.
 */
export function buildSitemapEntries(source: SitemapSource): MetadataRoute.Sitemap {
  const listedAuthors = new Set(source.authorIds);
  // The two lists can differ when their cache lifetimes do: a poem of an author who has left the list is left out.
  const poems = source.poemRefs.filter((poem) => listedAuthors.has(poem.authorId));

  const paths = [
    ...FIXED_PATHS,
    ...source.authorIds.map(authorPagePath),
    ...poems.map((poem) => authorPoemPath(poem.authorId, poem.id)),
    ...distinctCollectionPaths(poems),
  ];
  return paths.map((path) => ({ url: `${source.siteUrl}${path}` }));
}
