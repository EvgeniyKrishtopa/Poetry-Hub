import { AdminVerifyTrail } from "@/features/admin";
import { Breadcrumbs } from "@/features/breadcrumbs";

// The trail is the admin's alone, and its label says whether there is a factor to enter or one to set up. `setup` is
// not a URL: it is the second row of this page's trail in breadcrumbs' route table.
export default function AdminVerifyBreadcrumbs() {
  return (
    <AdminVerifyTrail
      enrolled={<Breadcrumbs segments={Promise.resolve(["admin", "verify"])} />}
      notEnrolled={<Breadcrumbs segments={Promise.resolve(["admin", "verify", "setup"])} />}
    />
  );
}
