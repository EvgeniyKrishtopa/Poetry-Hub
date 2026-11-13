import type { AdminDeleteControlProps } from "./AdminDeleteControl.types";

/** The admin-only delete button and its confirmation, in its own Suspense boundary; nothing for anyone else (design D8). */
export function AdminDeleteControl(props: AdminDeleteControlProps) {
  void props;
  return null;
}
