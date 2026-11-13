import "server-only";

import { getSessionState } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

/** Whether the session can write, and why not when it can't. */
export type SessionCheck =
  { readonly ok: true } | { readonly ok: false; readonly failure: "unauthenticated" | "unavailable" };

/**
 * The session step both actions share; the feature's own copy over `auth`'s public API. The proxy has already
 * refreshed an expired access token, so signed-out means the session is gone; one that can't be checked is
 * `unavailable`, not "expired".
 */
export async function checkSession(): Promise<SessionCheck> {
  const { state } = await getSessionState();
  if (state === SESSION_STATE.signedIn) return { ok: true };
  return { ok: false, failure: state === SESSION_STATE.signedOut ? "unauthenticated" : "unavailable" };
}
