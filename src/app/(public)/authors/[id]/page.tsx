import { AuthorPage } from "@/features/authors";

export default function AuthorRoutePage({ params }: PageProps<"/authors/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <AuthorPage id={params.then(({ id }) => id)} />
    </main>
  );
}
