import { AdminDeleteControl } from "@/features/admin";
import { authorPagePath } from "@/features/authors";
import { PoemPage } from "@/features/poems";

export default function PoemRoutePage({ params }: PageProps<"/authors/[id]/poems/[poemId]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <PoemPage
        authorId={params.then(({ id }) => id)}
        poemId={params.then(({ poemId }) => poemId)}
        moderation={(target) => (
          <AdminDeleteControl
            kind="poem"
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
