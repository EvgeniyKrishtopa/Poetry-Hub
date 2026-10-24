export interface AuthorPoemsEntryProps {
  /** The author route's `id` param; the entry renders inside `AuthorPage`'s boundary, after the profile. */
  readonly authorId: Promise<string>;
}
