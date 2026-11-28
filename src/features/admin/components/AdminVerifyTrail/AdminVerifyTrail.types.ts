import type { ReactNode } from "react";

export interface AdminVerifyTrailProps {
  /** The trail for an admin with a verified factor. */
  readonly enrolled: ReactNode;
  /** The trail for an admin who still has to enrol. */
  readonly notEnrolled: ReactNode;
}
