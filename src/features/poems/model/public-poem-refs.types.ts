/** The ids of a public poem the sitemap needs: its page and, when set, its collection's page. */
export interface PublicPoemRef {
  /** Lowercase UUID. */
  readonly id: string;
  /** The lowercase UUID of the poem's author (a public profile). */
  readonly authorId: string;
  /** The lowercase UUID of the poem's collection, or `null` for a free poem. */
  readonly collectionId: string | null;
}

/** Every public poem's references, or why they can't be read (seo-metadata design D5). */
export type PublicPoemRefsResult =
  | { readonly ok: true; readonly refs: readonly PublicPoemRef[] }
  | { readonly ok: false; readonly reason: "unavailable" };
