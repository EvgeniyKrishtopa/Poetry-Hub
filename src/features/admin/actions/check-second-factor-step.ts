import "server-only";

import { redirect } from "next/navigation";

import { getSessionState } from "@/features/auth";
import { ADMIN_PATH, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { SESSION_STATE } from "@/shared/config/constants";

import { readAdminAccess } from "../dal/admin-access";

/**
 * The gate both second factor actions share: only an admin who still has to verify goes on. A signed-out caller is
 * sent to `/login` and an already verified one to `/admin`; everything else, a reader who is not an admin included,
 * answers `ok: false`, so a regular user is offered no second factor.
 */
export async function checkSecondFactorStep(): Promise<{ readonly ok: boolean }> {
  const session = await getSessionState();
  // `redirect` throws, so it stays outside every try.
  if (session.state === SESSION_STATE.signedOut) redirect(SIGN_IN_PATH);

  const access = await readAdminAccess(session);
  if (access === "admin") redirect(ADMIN_PATH);
  return { ok: access === "needs-second-factor" };
}
