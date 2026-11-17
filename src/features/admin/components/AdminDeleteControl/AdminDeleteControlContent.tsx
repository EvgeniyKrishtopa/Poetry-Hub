import { getSessionState } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

import { checkMayModerateAuthor } from "../../dal/admin-check";
import { AdminDeleteButton } from "../AdminDeleteButton/AdminDeleteButton";

import type { AdminDeleteControlProps } from "./AdminDeleteControl.types";

/**
 * The session is read first and the database is asked only of a signed-in reader, so a guest costs no RPC (NFR-3).
 * An unreadable session or answer shows nothing: the control is never offered on a guess (FR-10).
 */
export async function AdminDeleteControlContent({ kind, id, title, authorId, redirectHref }: AdminDeleteControlProps) {
  const { state } = await getSessionState();
  if (state !== SESSION_STATE.signedIn) return null;

  const check = await checkMayModerateAuthor(authorId);
  if (!check.ok || !check.mayModerate) return null;

  return <AdminDeleteButton kind={kind} id={id} title={title} redirectHref={redirectHref} />;
}
