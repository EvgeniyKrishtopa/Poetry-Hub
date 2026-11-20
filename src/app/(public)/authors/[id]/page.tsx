import { AddToViolationsControl, AdminActionNotice } from "@/features/admin";
import { AuthorPage, getAuthorPageMetadata } from "@/features/authors";
import { PublicCollectionsSection } from "@/features/collections";
import { AuthorPoemsEntry } from "@/features/poems";

export async function generateMetadata({ params }: PageProps<"/authors/[id]">) {
  const { id } = await params;
  return getAuthorPageMetadata(id);
}

export default function AuthorRoutePage({ params }: PageProps<"/authors/[id]">) {
  const id = params.then(({ id }) => id);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <AuthorPage
        id={id}
        poems={
          <>
            <PublicCollectionsSection authorId={id} />
            <AuthorPoemsEntry authorId={id} />
          </>
        }
        renderModeration={(target) => (
          <>
            <AdminActionNotice />
            <AddToViolationsControl authorId={target.authorId} authorName={target.authorName} />
          </>
        )}
      />
    </main>
  );
}
