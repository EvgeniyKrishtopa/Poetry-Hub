/** One poem of an author, as stored (add-poem-creation design D3). */
export interface Poem {
  /** Lowercase UUID; matched case-sensitively in URLs. */
  readonly id: string;
  readonly title: string;
  /** Markdown source; a blank line separates stanzas. */
  readonly text: string;
  /** The public Storage URL of the illustration, or `null` when the poem has none. */
  readonly illustrationUrl: string | null;
  /** ISO date, `YYYY-MM-DD`: the UTC date of the poem's creation. */
  readonly publishedAt: string;
  /** A Contentful `tag` entry id, or `null` for no genre. */
  readonly genreId: string | null;
}

/** An author's poems, newest first, or why they can't be read (add-poem-creation design D3). */
export type AuthorPoemsResult =
  | { readonly ok: true; readonly poems: readonly Poem[] }
  | { readonly ok: false; readonly reason: "unavailable" };

/** One poem of one author, or why it can't be shown. */
export type AuthorPoemResult =
  | { readonly ok: true; readonly poem: Poem }
  | { readonly ok: false; readonly reason: "not-found" | "unavailable" };

/** One Contentful `tag` entry offered as a genre (design D5). */
export interface PoemGenre {
  /** The entry's `sys.id`, stored as `poems.genre_id`. */
  readonly id: string;
  readonly name: string;
}

/** The genres, sorted by Russian name, or why they can't be read (design D5). */
export type PoemGenresResult =
  | { readonly ok: true; readonly genres: readonly PoemGenre[] }
  | { readonly ok: false; readonly reason: "unavailable" };

/** A poem page's genre line: left out for `none`. */
export type PoemGenreName = { readonly kind: "named"; readonly name: string } | { readonly kind: "none" };
