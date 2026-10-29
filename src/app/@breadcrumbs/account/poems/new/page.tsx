import { Breadcrumbs } from "@/features/breadcrumbs";

export default function NewPoemBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["account", "poems", "new"])} />;
}
