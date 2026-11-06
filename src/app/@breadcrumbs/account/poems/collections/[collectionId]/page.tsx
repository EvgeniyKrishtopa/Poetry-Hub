import { Breadcrumbs } from "@/features/breadcrumbs";

// The slot page every real page needs (breadcrumbs-slot test); its trail arrives with task 7.1's matcher.
export default function CollectionBreadcrumbs({ params }: PageProps<"/account/poems/collections/[collectionId]">) {
  return <Breadcrumbs segments={params.then(({ collectionId }) => ["account", "poems", "collections", collectionId])} />;
}
