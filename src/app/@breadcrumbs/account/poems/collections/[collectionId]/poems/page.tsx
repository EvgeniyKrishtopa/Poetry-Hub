import { Breadcrumbs } from "@/features/breadcrumbs";
import { COLLECTION_POEMS_SEGMENT, COLLECTIONS_SEGMENT } from "@/features/collection-management";

export default function CollectionPoemsBreadcrumbs({ params }: PageProps<"/account/poems/collections/[collectionId]/poems">) {
  return (
    <Breadcrumbs
      segments={params.then(({ collectionId }) => ["account", "poems", COLLECTIONS_SEGMENT, collectionId, COLLECTION_POEMS_SEGMENT])}
    />
  );
}
