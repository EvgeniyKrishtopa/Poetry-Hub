import { Suspense } from "react";

import { AdminOnlyContent } from "./AdminOnlyContent";
import type { AdminOnlyProps } from "./AdminOnly.types";

/**
 * Renders its children to a signed-in admin and to no one else, in its own boundary with an empty fallback, so the
 * prerendered shell is the same for everyone and nothing in it gives the admin tools away (design D13, D14). The
 * header link and the `/admin` breadcrumb slot are built on it.
 */
export function AdminOnly({ children }: AdminOnlyProps) {
  return (
    <Suspense fallback={null}>
      <AdminOnlyContent>{children}</AdminOnlyContent>
    </Suspense>
  );
}
