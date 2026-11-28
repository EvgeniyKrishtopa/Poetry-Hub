import { getSessionState } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

import { readAdminAccess } from "../../dal/admin-access";
import { AddToHomeButton } from "../AddToHomeButton/AddToHomeButton";

import type { AddToHomeControlProps } from "./AddToHomeControl.types";

/**
 * The session is read first and the database is asked only of a signed-in reader, so a guest costs no RPC. The check is
 * `readAdminAccess`, the per-request answer the page gate shares, and never `may_moderate_author`: that one hides an
 * admin's own content, and this control must show there too (FR-8). An unreadable session or answer shows nothing.
 */
export async function AddToHomeControlContent({ id, kind }: AddToHomeControlProps) {
  const session = await getSessionState();
  if (session.state === SESSION_STATE.signedOut) return null;

  const access = await readAdminAccess(session);
  if (access !== "admin") return null;

  return <AddToHomeButton id={id} kind={kind} />;
}
