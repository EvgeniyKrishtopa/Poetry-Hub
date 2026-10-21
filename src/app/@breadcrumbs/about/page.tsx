import { Breadcrumbs } from "@/features/breadcrumbs";

export default function AboutBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["about"])} />;
}
