import { Suspense } from "react";

import { AdminDeleteControlContent } from "./AdminDeleteControlContent";
import type { AdminDeleteControlProps } from "./AdminDeleteControl.types";

/** The admin-only delete button and its confirmation, in its own Suspense boundary; nothing for anyone else (design D8). */
export function AdminDeleteControl(props: AdminDeleteControlProps) {
  return (
    <Suspense fallback={null}>
      <AdminDeleteControlContent {...props} />
    </Suspense>
  );
}
