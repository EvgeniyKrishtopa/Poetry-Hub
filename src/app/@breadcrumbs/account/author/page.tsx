import { Breadcrumbs } from "@/features/breadcrumbs";

export default function AuthorEditorBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["account", "author"])} />;
}
