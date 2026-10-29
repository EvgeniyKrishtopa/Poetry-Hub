import { OwnPoemPage } from "@/features/poem-management";

export default function OwnPoemRoutePage({ params }: PageProps<"/account/poems/[poemId]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <OwnPoemPage poemId={params.then(({ poemId }) => poemId)} />
    </main>
  );
}
