import { Breadcrumbs } from "@/features/breadcrumbs";

export default function SignupBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["signup"])} />;
}
