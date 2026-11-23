import { Suspense } from "react";

import { AdminListSkeleton } from "../../components/AdminListSkeleton/AdminListSkeleton";
import { ViolationReviewPageContent } from "./ViolationReviewPageContent";

/**
 * `/admin/violations`: the gate and the list inside their own Suspense boundary, like `UserModerationPage` (design D7). The
 * page reads the session on every request, and under Cache Components such dynamic data must sit inside a boundary.
 * The fallback is bare rows, with no title: until the admin check answers, the page must not announce itself to a
 * non-admin.
 */
export function ViolationReviewPage() {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <ViolationReviewPageContent />
    </Suspense>
  );
}
