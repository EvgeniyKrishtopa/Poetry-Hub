import "server-only";

import { getSessionState } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

/** Whether the session can write, and why not when it can't (design D5-D7, step "session"). */
export type SessionCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly failure: "unauthenticated" | "unavailable" };

/**
 * The session step all three actions share. The proxy has already refreshed an expired access token, so
 * signed-out means the session is gone; one that can't be checked gets the outage message, not "expired".
 */
export async function checkSession(): Promise<SessionCheck> {
  const { state } = await getSessionState();
  if (state === SESSION_STATE.signedIn) return { ok: true };
  return { ok: false, failure: state === SESSION_STATE.signedOut ? "unauthenticated" : "unavailable" };
}
