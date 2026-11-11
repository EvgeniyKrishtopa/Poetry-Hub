import { Breadcrumbs } from "@/features/breadcrumbs";
import { PUBLIC_COLLECTIONS_SEGMENT } from "@/features/collections";

export default function PublicCollectionBreadcrumbs({
  params,
}: PageProps<"/authors/[id]/collections/[collectionId]">) {
  return (
    <Breadcrumbs
      segments={params.then(({ id, collectionId }) => ["authors", id, PUBLIC_COLLECTIONS_SEGMENT, collectionId])}
    />
  );
}
