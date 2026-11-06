import { EditCollectionPage } from "@/features/collection-management";

export default function EditCollectionRoutePage({ params }: PageProps<"/account/poems/collections/[collectionId]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <EditCollectionPage collectionId={params.then(({ collectionId }) => collectionId)} />
    </main>
  );
}
