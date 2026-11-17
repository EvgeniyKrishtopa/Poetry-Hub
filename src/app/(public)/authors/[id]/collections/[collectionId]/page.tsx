import { AdminDeleteControl } from "@/features/admin";
import { authorPagePath } from "@/features/authors";
import { PublicCollectionPage } from "@/features/collections";

export default function CollectionRoutePage({ params }: PageProps<"/authors/[id]/collections/[collectionId]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <PublicCollectionPage
        authorId={params.then(({ id }) => id)}
        collectionId={params.then(({ collectionId }) => collectionId)}
        renderModeration={(target) => (
          <AdminDeleteControl
            kind="collection"
            id={target.id}
            title={target.title}
            authorId={target.authorId}
            redirectHref={authorPagePath(target.authorId)}
          />
        )}
      />
    </main>
  );
}
