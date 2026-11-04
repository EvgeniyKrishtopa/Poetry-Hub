import type { CollectionContentProps } from "./CollectionContent.types";

/** Session, `getOwnCollection`, then the notice, title, description, and actions; `notFound()`; or a throw (design D4). */
export function CollectionContent({ collectionId }: CollectionContentProps) {
  void collectionId;
  return null;
}
