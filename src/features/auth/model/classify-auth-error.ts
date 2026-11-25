import { SupabaseConfigError } from "@/shared/lib/supabase";

import { AUTH_ERROR_CODE, BANNED_SIGNUP_REJECTION, HTTP_TOO_MANY_REQUESTS } from "./auth.constants";
import type { AuthFailure } from "./auth.types";
import { readErrorProperty } from "./read-error-property";

const FAILURE_BY_CODE: ReadonlyMap<string, AuthFailure> = new Map([
  [AUTH_ERROR_CODE.invalidCredentials, "invalid-credentials"],
  // Auth refuses a sign-in of a blocked or banned account (its `banned_until` is in the future).
  [AUTH_ERROR_CODE.userBanned, "restricted"],
  [AUTH_ERROR_CODE.emailNotConfirmed, "email-not-confirmed"],
  [AUTH_ERROR_CODE.overRequestRateLimit, "rate-limited"],
  [AUTH_ERROR_CODE.overEmailSendRateLimit, "rate-limited"],
  [AUTH_ERROR_CODE.weakPassword, "weak-password"],
  [AUTH_ERROR_CODE.samePassword, "same-password"],
]);

/** Whether a sign-up error is the hook's rejection of a banned address, not any other failure. */
export function isBannedSignUpRejection(error: unknown): boolean {
  return (
    readErrorProperty(error, "status") === BANNED_SIGNUP_REJECTION.status &&
    readErrorProperty(error, "message") === BANNED_SIGNUP_REJECTION.message
  );
}

/**
 * Maps a Supabase auth error (or anything else) to the failure the forms show.
 * The only place a missing config becomes `unavailable` (design D7).
 */
export function classifyAuthError(error: unknown): AuthFailure {
  const code = readErrorProperty(error, "code");
  const byCode = typeof code === "string" ? FAILURE_BY_CODE.get(code) : undefined;
  if (byCode) return byCode;
  if (readErrorProperty(error, "status") === HTTP_TOO_MANY_REQUESTS) return "rate-limited";
  if (error instanceof SupabaseConfigError) return "unavailable";
  return "unknown";
}
