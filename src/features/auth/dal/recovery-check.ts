import "server-only";

import { SESSION_STATE } from "@/shared/config/constants";

import { isRecentRecoverySession } from "../model/recovery-session";

import { getSessionState } from "./current-user";

export type RecoveryCheckResult = "recovery" | "not-recovery" | "unknown";

const MS_PER_SECOND = 1000;

/**
 * The current session's answer to "may it set a new password": signed out is `not-recovery`, an outage is `unknown`,
 * which callers fail closed on. Never throws.
 */
export async function checkRecoverySession(): Promise<RecoveryCheckResult> {
  const session = await getSessionState();
  if (session.state === SESSION_STATE.unknown) return "unknown";
  if (session.state === SESSION_STATE.signedOut) return "not-recovery";

  // Read after the session: `getSessionState` awaits `connection()`, so the clock is never read during prerender.
  const nowSeconds = Math.floor(Date.now() / MS_PER_SECOND);
  return isRecentRecoverySession(session.amr, nowSeconds) ? "recovery" : "not-recovery";
}
