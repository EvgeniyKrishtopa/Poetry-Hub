import type { ReactNode } from "react";

export interface AdminOnlyProps {
  readonly children: ReactNode;
  /**
   * Also show to an admin who has not verified the second factor yet. Only for what leads to `/admin/verify`, never
   * for a control that writes.
   */
  readonly includeBeforeSecondFactor?: boolean;
}
