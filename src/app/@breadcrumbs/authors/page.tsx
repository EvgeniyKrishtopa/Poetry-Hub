import { Breadcrumbs } from "@/features/breadcrumbs";

export default function AuthorsBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["authors"])} />;
}
