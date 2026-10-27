import { AuthorPage } from "@/features/authors";
import { AuthorPoemsEntry } from "@/features/poems";

export default function AuthorRoutePage({ params }: PageProps<"/authors/[id]">) {
  const id = params.then(({ id }) => id);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <AuthorPage id={id} poems={<AuthorPoemsEntry authorId={id} />} />
    </main>
  );
}
