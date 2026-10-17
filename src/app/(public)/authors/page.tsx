import { AuthorDirectory } from "@/features/authors";

export default function AuthorsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <AuthorDirectory />
    </main>
  );
}
