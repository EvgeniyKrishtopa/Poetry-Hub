/** The URL segment under an author page that holds the author's collections: `/authors/<id>/collections`. */
export const PUBLIC_COLLECTIONS_SEGMENT = "collections";

/** `/authors/<authorId>/collections/<collectionId>`, built on the author page path (public-collections D7). */
export function publicCollectionPath(authorId: string, collectionId: string): string {
  void authorId;
  void collectionId;
  throw new Error("not implemented");
}
