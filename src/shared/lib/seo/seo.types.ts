import "server-only";

/** The Open Graph type of a page: `article` for a poem, `profile` for an author, `website` elsewhere (FR-4). */
export type PageType = "website" | "article" | "profile";

/** What a public page tells the builder; the rest of its metadata is derived from it (FR-1 to FR-5). */
export interface PageMetadataInput {
  /** The page's own title, without the site's title template suffix. */
  readonly title: string;
  /** Plain text, already shortened per NFR-4. */
  readonly description: string;
  /** The page's own path, lowercase ids, no query and no hash: the base of the canonical and `og:url`. */
  readonly path: string;
  readonly type: PageType;
  /** An absolute image URL (a poem illustration or an author photo); the default share image when `null` or left out. */
  readonly image?: string | null;
}

/** What a signed-in or auth page tells the builder: a title and the robots rule, never a card (FR-6, FR-7). */
export interface NoIndexMetadataInput {
  readonly title: string;
  /** `true` for `/login` and `/signup` (`noindex, follow`), `false` for the signed-in pages (`noindex, nofollow`). */
  readonly follow: boolean;
  /** Set for the pages that keep a canonical URL (login and sign-up); left out for the signed-in pages. */
  readonly canonicalPath?: string;
}
