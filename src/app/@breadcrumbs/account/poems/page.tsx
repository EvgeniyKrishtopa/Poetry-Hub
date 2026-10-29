import { Breadcrumbs } from "@/features/breadcrumbs";

export default function MyPoemsBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["account", "poems"])} />;
}
