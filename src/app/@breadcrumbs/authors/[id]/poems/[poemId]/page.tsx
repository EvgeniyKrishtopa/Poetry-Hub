import { Breadcrumbs } from "@/features/breadcrumbs";

export default function PoemBreadcrumbs({ params }: PageProps<"/authors/[id]/poems/[poemId]">) {
  return <Breadcrumbs segments={params.then(({ id, poemId }) => ["authors", id, "poems", poemId])} />;
}
