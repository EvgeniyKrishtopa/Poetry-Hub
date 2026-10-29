import { Breadcrumbs } from "@/features/breadcrumbs";

export default function OwnPoemBreadcrumbs({ params }: PageProps<"/account/poems/[poemId]">) {
  return <Breadcrumbs segments={params.then(({ poemId }) => ["account", "poems", poemId])} />;
}
