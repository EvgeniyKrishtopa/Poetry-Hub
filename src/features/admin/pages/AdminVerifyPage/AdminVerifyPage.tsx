import { Suspense } from "react";

import { AdminListSkeleton } from "../../components/AdminListSkeleton/AdminListSkeleton";
import { AdminVerifyPageContent } from "./AdminVerifyPageContent";

/**
 * `/admin/verify`: the gate and the second factor screens inside their own Suspense boundary with the bare skeleton of
 * the other admin pages, so nothing announces the page to a non-admin.
 */
export function AdminVerifyPage() {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <AdminVerifyPageContent />
    </Suspense>
  );
}
