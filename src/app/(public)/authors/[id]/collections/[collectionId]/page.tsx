import { AddToViolationsControl, AdminDeleteControl } from "@/features/admin";
import { authorPagePath } from "@/features/authors";
import { PublicCollectionPage, getPublicCollectionPageMetadata } from "@/features/collections";

export async function generateMetadata({ params }: PageProps<"/authors/[id]/collections/[collectionId]">) {
  const { id, collectionId } = await params;
  return getPublicCollectionPageMetadata(id, collectionId);
}

export default function CollectionRoutePage({ params }: PageProps<"/authors/[id]/collections/[collectionId]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <PublicCollectionPage
        authorId={params.then(({ id }) => id)}
        collectionId={params.then(({ collectionId }) => collectionId)}
        renderModeration={(target) => (
          <div className="flex flex-wrap items-end gap-3">
            <AddToViolationsControl
              authorId={target.authorId}
              authorName={target.authorName}
              content={{ kind: "collection", id: target.id, title: target.title }}
            />
            <AdminDeleteControl
              kind="collection"
              id={target.id}
              title={target.title}
              authorId={target.authorId}
              redirectHref={authorPagePath(target.authorId)}
            />
          </div>
        )}
      />
    </main>
  );
}
