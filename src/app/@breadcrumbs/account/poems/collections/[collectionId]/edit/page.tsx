import { Breadcrumbs } from "@/features/breadcrumbs";
import { COLLECTION_EDIT_SEGMENT, COLLECTIONS_SEGMENT } from "@/features/collection-management";

// The slot page every real page needs (breadcrumbs-slot test); its trail arrives with task 7.1's matcher.
export default function EditCollectionBreadcrumbs({ params }: PageProps<"/account/poems/collections/[collectionId]/edit">) {
  return (
    <Breadcrumbs
      segments={params.then(({ collectionId }) => ["account", "poems", COLLECTIONS_SEGMENT, collectionId, COLLECTION_EDIT_SEGMENT])}
    />
  );
}
