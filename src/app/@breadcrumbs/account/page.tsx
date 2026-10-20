import { Breadcrumbs } from "@/features/breadcrumbs";

export default function AccountBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["account"])} />;
}
