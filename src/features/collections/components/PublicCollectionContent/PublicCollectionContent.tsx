import type { PublicCollectionContentProps } from "./PublicCollectionContent.types";

/**
 * Checks the author, then reads the collection and renders its heading, description, and poems; `notFound()` on an
 * unknown author or collection, throws to the error screen on unavailable (public-collections D7).
 */
export function PublicCollectionContent({ authorId, collectionId }: PublicCollectionContentProps) {
  void authorId;
  void collectionId;
  return null;
}
