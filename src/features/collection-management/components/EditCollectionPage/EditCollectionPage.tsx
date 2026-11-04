import type { EditCollectionPageProps } from "./EditCollectionPage.types";

/** `/account/poems/collections/<id>/edit`: the heading in the static shell, the content in Suspense (design D6). */
export function EditCollectionPage({ collectionId }: EditCollectionPageProps) {
  void collectionId;
  return null;
}
