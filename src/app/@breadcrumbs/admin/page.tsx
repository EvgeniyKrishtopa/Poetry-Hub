import { Breadcrumbs } from "@/features/breadcrumbs";

// `/admin` has no route-table row on purpose, so its trail is empty, like an unknown URL (admin-moderation design D9).
export default function AdminBreadcrumbs() {
  return <Breadcrumbs segments={Promise.resolve(["admin"])} />;
}
