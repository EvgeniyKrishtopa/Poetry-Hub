export interface PublicCollectionsSectionProps {
  /** The author route's `id` param; the section renders inside `AuthorPage`'s boundary, before the poems section. */
  readonly authorId: Promise<string>;
}
