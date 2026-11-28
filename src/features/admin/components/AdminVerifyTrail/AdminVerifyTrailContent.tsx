import { getSessionState } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

import { readAdminAccess } from "../../dal/admin-access";
import { readTotpFactor } from "../../dal/totp";

import type { AdminVerifyTrailProps } from "./AdminVerifyTrail.types";

/** The same reads as the page, shared per request, so page and trail cannot disagree. */
export async function AdminVerifyTrailContent({ enrolled, notEnrolled }: AdminVerifyTrailProps) {
  const session = await getSessionState();
  if (session.state === SESSION_STATE.signedOut) return null;
  const access = await readAdminAccess(session);
  if (access !== "needs-second-factor") return null;

  const factor = await readTotpFactor();
  if (!factor.ok) return null;
  return factor.status === "enrolled" ? enrolled : notEnrolled;
}
