import { Breadcrumbs } from "@/features/breadcrumbs";

export default function AuthorPoemsBreadcrumbs({ params }: PageProps<"/authors/[id]/poems">) {
  return <Breadcrumbs segments={params.then(({ id }) => ["authors", id, "poems"])} />;
}
