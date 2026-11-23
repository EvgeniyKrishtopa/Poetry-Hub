const AUTHOR_WORKS_TAG_PREFIX = "author-works:";

/**
 * The cache tag of the admin's home-page choice (the ids of the featured poems and authors). `admin` expires it after
 * a write that changed the list and `home` reads it, so it lives here like `authorWorksTag` (home-page-sections D5).
 */
export const HOME_FEATURED_TAG = "home-featured";

/**
 * The one cache tag of an author's public works, their poems and their collections: `author-works:<authorId>`.
 * Every write that changes what the public author or collection pages show expires it (public-collections D4).
 */
export function authorWorksTag(authorId: string): string {
  return `${AUTHOR_WORKS_TAG_PREFIX}${authorId}`;
}
