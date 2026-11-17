import { AdminOnly } from "@/features/admin";
import { Breadcrumbs } from "@/features/breadcrumbs";

// The trail is the admin's alone, so a non-admin's not-found screen at `/admin` shows none and the page does not
// announce itself (admin-moderation design D9, D14).
export default function AdminBreadcrumbs() {
  return (
    <AdminOnly>
      <Breadcrumbs segments={Promise.resolve(["admin"])} />
    </AdminOnly>
  );
}
