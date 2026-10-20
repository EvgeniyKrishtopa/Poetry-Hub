import { Breadcrumbs } from "@/features/breadcrumbs";

export default function AuthorBreadcrumbs({ params }: PageProps<"/authors/[id]">) {
  return <Breadcrumbs segments={params.then(({ id }) => ["authors", id])} />;
}
