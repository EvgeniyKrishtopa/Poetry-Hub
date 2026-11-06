import { Breadcrumbs } from "@/features/breadcrumbs";
import { COLLECTION_EDIT_SEGMENT, COLLECTIONS_SEGMENT } from "@/features/collection-management";

export default function EditCollectionBreadcrumbs({ params }: PageProps<"/account/poems/collections/[collectionId]/edit">) {
  return (
    <Breadcrumbs
      segments={params.then(({ collectionId }) => ["account", "poems", COLLECTIONS_SEGMENT, collectionId, COLLECTION_EDIT_SEGMENT])}
    />
  );
}
