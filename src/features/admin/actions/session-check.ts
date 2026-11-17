import "server-only";

import { getSessionState } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

import type { SessionCheck } from "../model/admin.types";

/**
 * The session step every action shares; the feature's own copy over `auth`'s public API. The proxy has already
 * refreshed an expired access token, so signed-out means the session is gone (`unauthenticated`); one that can't be
 * checked is `unavailable`, never "expired" (FR-12).
 */
export async function checkSession(): Promise<SessionCheck> {
  const { state } = await getSessionState();
  if (state === SESSION_STATE.signedIn) return { ok: true };
  return { ok: false, failure: state === SESSION_STATE.signedOut ? "unauthenticated" : "unavailable" };
}
