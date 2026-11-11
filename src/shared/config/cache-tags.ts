const AUTHOR_WORKS_TAG_PREFIX = "author-works:";

/**
 * The one cache tag of an author's public works, their poems and their collections: `author-works:<authorId>`.
 * Every write that changes what the public author or collection pages show expires it (public-collections D4).
 */
export function authorWorksTag(authorId: string): string {
  return `${AUTHOR_WORKS_TAG_PREFIX}${authorId}`;
}
