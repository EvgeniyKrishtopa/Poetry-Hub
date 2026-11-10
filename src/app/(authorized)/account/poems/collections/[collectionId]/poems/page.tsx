import { CollectionPoemsPage } from "@/features/collection-management";

export default function CollectionPoemsRoutePage({ params }: PageProps<"/account/poems/collections/[collectionId]/poems">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <CollectionPoemsPage collectionId={params.then(({ collectionId }) => collectionId)} />
    </main>
  );
}
