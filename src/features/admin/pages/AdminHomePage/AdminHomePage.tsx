import { Suspense } from "react";

import { AdminListSkeleton } from "../../components/AdminListSkeleton/AdminListSkeleton";
import { AdminHomePageContent } from "../AdminHomePageContent/AdminHomePageContent";

/**
 * `/admin/home`: the gate and the lists inside their own Suspense boundary with a bare skeleton, like
 * `AdminViolationsPage`: until the admin check answers, the page must not announce itself to a non-admin (FR-9).
 */
export function AdminHomePage() {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <AdminHomePageContent />
    </Suspense>
  );
}
