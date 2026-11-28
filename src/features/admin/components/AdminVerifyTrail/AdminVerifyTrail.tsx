import { Suspense } from "react";

import { AdminVerifyTrailContent } from "./AdminVerifyTrailContent";
import type { AdminVerifyTrailProps } from "./AdminVerifyTrail.types";

/**
 * Picks the trail of `/admin/verify` by whether the admin has a factor, and shows none to anyone else. Its own boundary
 * with an empty fallback, like `AdminOnly`.
 */
export function AdminVerifyTrail(props: AdminVerifyTrailProps) {
  return (
    <Suspense fallback={null}>
      <AdminVerifyTrailContent {...props} />
    </Suspense>
  );
}
