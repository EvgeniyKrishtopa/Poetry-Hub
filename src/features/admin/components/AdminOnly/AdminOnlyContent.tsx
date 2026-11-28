import { getSessionState } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

import { readAdminAccess } from "../../dal/admin-access";

import type { AdminOnlyProps } from "./AdminOnly.types";

/** The session is read first; `is_admin()` is asked only of a signed-in reader, so a guest costs no RPC (FR-20, FR-21). */
export async function AdminOnlyContent({ children, includeBeforeSecondFactor = false }: AdminOnlyProps) {
  const session = await getSessionState();
  if (session.state === SESSION_STATE.signedOut) return null;
  const access = await readAdminAccess(session);
  if (access === "admin") return children;
  if (access === "needs-second-factor" && includeBeforeSecondFactor) return children;

  return null;
}
