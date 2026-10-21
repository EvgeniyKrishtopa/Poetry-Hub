import { Breadcrumbs } from "@/features/breadcrumbs";

export default function PrivacyBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["privacy"])} />;
}
