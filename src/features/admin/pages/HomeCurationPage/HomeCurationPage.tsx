import { Suspense } from "react";

import { AdminListSkeleton } from "../../components/AdminListSkeleton/AdminListSkeleton";
import { HomeCurationPageContent } from "../HomeCurationPageContent/HomeCurationPageContent";

/**
 * `/admin/home`: the gate and the lists inside their own Suspense boundary with a bare skeleton, like
 * `ViolationReviewPage`: until the admin check answers, the page must not announce itself to a non-admin (FR-9).
 */
export function HomeCurationPage() {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <HomeCurationPageContent />
    </Suspense>
  );
}
