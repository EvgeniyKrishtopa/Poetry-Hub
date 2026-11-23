import { AdminOnly } from "@/features/admin";
import { Breadcrumbs } from "@/features/breadcrumbs";

// The trail is the admin's alone, like the ones of `/admin` and `/admin/violations`, so a non-admin's not-found screen
// shows none and the page does not announce itself.
export default function AdminHomeBreadcrumbs() {
  return (
    <AdminOnly>
      <Breadcrumbs segments={Promise.resolve(["admin", "home"])} />
    </AdminOnly>
  );
}
