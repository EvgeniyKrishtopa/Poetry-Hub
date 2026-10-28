/** One poem of an author. Plain text with a blank line between stanzas. */
export interface Poem {
  /** Lowercase slug, unique in the set; matched case-sensitively in URLs. */
  readonly id: string;
  readonly title: string;
  readonly text: string;
  /** A path under `public/`, e.g. `/mock-poems/<id>.svg`. */
  readonly illustrationSrc: string;
  /** ISO date, `YYYY-MM-DD`. */
  readonly publishedAt: string;
  readonly genre: string;
}

/** One poem of one author; the database version will add an `unavailable` reason. */
export type AuthorPoemResult =
  | { readonly ok: true; readonly poem: Poem }
  | { readonly ok: false; readonly reason: "not-found" };

/**
 * An author's poems, newest first, or why they can't be read (add-poem-creation design D3).
 * @public Scaffold: no importer until task 3.1.
 */
export type AuthorPoemsResult =
  | { readonly ok: true; readonly poems: readonly Poem[] }
  | { readonly ok: false; readonly reason: "unavailable" };

/**
 * One Contentful `tag` entry offered as a genre (design D5).
 * @public Scaffold: no importer until task 3.2.
 */
export interface PoemGenre {
  /** The entry's `sys.id`, stored as `poems.genre_id`. */
  readonly id: string;
  readonly name: string;
}

/** @public Scaffold: no importer until task 3.2. */
export type PoemGenresResult =
  | { readonly ok: true; readonly genres: readonly PoemGenre[] }
  | { readonly ok: false; readonly reason: "unavailable" };

/**
 * A poem page's genre line: left out for `none`.
 * @public Scaffold: no importer until task 3.2.
 */
export type PoemGenreName = { readonly kind: "named"; readonly name: string } | { readonly kind: "none" };
