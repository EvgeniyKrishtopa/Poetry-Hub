import { isAuthRetryableFetchError } from "@supabase/supabase-js";

import { SESSION_STATE } from "@/shared/config/constants";

/** The lowest HTTP status Supabase Auth answers with when it is failing, not refusing the token. */
const SERVER_ERROR_STATUS = 500;

export type SessionState = (typeof SESSION_STATE)[keyof typeof SESSION_STATE];

export type ClaimsState =
  | { readonly state: typeof SESSION_STATE.signedIn; readonly userId: string }
  | { readonly state: typeof SESSION_STATE.signedOut }
  | { readonly state: typeof SESSION_STATE.unknown };

/** The parts of a `getClaims()` result this reading looks at. */
export interface ClaimsResult {
  readonly data: { readonly claims?: { readonly sub?: unknown } | null } | null;
  readonly error: unknown;
}

/** supabase-js returns a network or outage failure rather than throwing it. */
function isOutage(error: unknown): boolean {
  if (isAuthRetryableFetchError(error)) return true;
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
  return typeof status === "number" && status >= SERVER_ERROR_STATUS;
}

/**
 * One reading of a `getClaims()` result, shared by the proxy and auth's session check so they can't
 * disagree on who is signed in (design D9). The rules apply in order, first match wins.
 */
export function readClaimsState({ data, error }: ClaimsResult): ClaimsState {
  if (isOutage(error)) return { state: SESSION_STATE.unknown };
  // An expired or invalid token: whatever claims came with it, there is no session.
  if (error) return { state: SESSION_STATE.signedOut };
  const sub = data?.claims?.sub;
  if (typeof sub === "string" && sub !== "") return { state: SESSION_STATE.signedIn, userId: sub };
  return { state: SESSION_STATE.signedOut };
}
