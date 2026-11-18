import { AdminOnly } from "@/features/admin";
import { Breadcrumbs } from "@/features/breadcrumbs";

// The trail is the admin's alone, like the one of `/admin`, so a non-admin's not-found screen shows none and the page
// does not announce itself (admin-violations-feedback design D7).
export default function AdminViolationsBreadcrumbs() {
  return (
    <AdminOnly>
      <Breadcrumbs segments={Promise.resolve(["admin", "violations"])} />
    </AdminOnly>
  );
}
