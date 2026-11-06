import { Breadcrumbs } from "@/features/breadcrumbs";

export default function NewCollectionBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["account", "poems", "collections", "new"])} />;
}
