import { Breadcrumbs } from "@/features/breadcrumbs";
import { EDIT_SEGMENT } from "@/features/poem-management";

export default function EditPoemBreadcrumbs({ params }: PageProps<"/account/poems/[poemId]/edit">) {
  return <Breadcrumbs segments={params.then(({ poemId }) => ["account", "poems", poemId, EDIT_SEGMENT])} />;
}
