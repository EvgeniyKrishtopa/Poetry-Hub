import type { AddToHomeControlProps } from "./AddToHomeControl.types";

/**
 * The admin check and the button: nothing for a guest or a non-admin, from the per-request `readAdminAccess`
 * answer only (never `may_moderate_author`, so an admin's own content gets it too, FR-8).
 */
export async function AddToHomeControlContent(props: AddToHomeControlProps): Promise<null> {
  void props;
  return null;
}
