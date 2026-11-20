/** One public poem as the sitemap reads it; structurally the poems feature's public poem reference. */
export interface SitemapPoemRef {
  readonly id: string;
  readonly authorId: string;
  readonly collectionId: string | null;
}

/** Everything `buildSitemapEntries` needs, so the function stays pure (FR-9). */
export interface SitemapSource {
  /** The site's origin, no trailing slash. */
  readonly siteUrl: string;
  /** The ids of the public authors; a poem of an author not in this list is left out. */
  readonly authorIds: readonly string[];
  readonly poemRefs: readonly SitemapPoemRef[];
}
