import { AddToViolationsControl, AdminDeleteControl } from "@/features/admin";
import { authorPagePath } from "@/features/authors";
import { PoemPage, getPoemPageMetadata } from "@/features/poems";

export async function generateMetadata({ params }: PageProps<"/authors/[id]/poems/[poemId]">) {
  const { id, poemId } = await params;
  return getPoemPageMetadata(id, poemId);
}

export default function PoemRoutePage({ params }: PageProps<"/authors/[id]/poems/[poemId]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <PoemPage
        authorId={params.then(({ id }) => id)}
        poemId={params.then(({ poemId }) => poemId)}
        renderModeration={(target) => (
          <div className="flex flex-wrap items-end gap-3">
            <AddToViolationsControl
              authorId={target.authorId}
              authorName={target.authorName}
              content={{ kind: "poem", id: target.id, title: target.title }}
            />
            <AdminDeleteControl
              kind="poem"
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
