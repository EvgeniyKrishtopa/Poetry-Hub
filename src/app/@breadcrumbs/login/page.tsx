import { Breadcrumbs } from "@/features/breadcrumbs";

export default function LoginBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["login"])} />;
}
