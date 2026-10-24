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
