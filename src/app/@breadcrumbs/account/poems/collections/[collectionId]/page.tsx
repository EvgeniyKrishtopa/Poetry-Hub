import { Breadcrumbs } from "@/features/breadcrumbs";
import { COLLECTIONS_SEGMENT } from "@/features/collection-management";

export default function CollectionBreadcrumbs({ params }: PageProps<"/account/poems/collections/[collectionId]">) {
  return <Breadcrumbs segments={params.then(({ collectionId }) => ["account", "poems", COLLECTIONS_SEGMENT, collectionId])} />;
}
