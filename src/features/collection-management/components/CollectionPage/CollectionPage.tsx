import type { CollectionPageProps } from "./CollectionPage.types";

/** `/account/poems/collections/<id>`: the collection in a Suspense boundary with its skeleton (design D4). */
export function CollectionPage({ collectionId }: CollectionPageProps) {
  void collectionId;
  return null;
}
