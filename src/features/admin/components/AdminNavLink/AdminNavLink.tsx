import { Suspense } from "react";

import { AdminNavLinkContent } from "./AdminNavLinkContent";

/** The header link to `/admin`, in its own boundary with an empty fallback: the prerendered shell is the same for everyone (design D13). */
export function AdminNavLink() {
  return (
    <Suspense fallback={null}>
      <AdminNavLinkContent />
    </Suspense>
  );
}
