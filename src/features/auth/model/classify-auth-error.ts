import { SupabaseConfigError } from "@/shared/lib/supabase";

import { BANNED_SIGNUP_REJECTION } from "./auth.constants";
import type { AuthFailure } from "./auth.types";

const FAILURE_BY_CODE: ReadonlyMap<string, AuthFailure> = new Map([
  ["invalid_credentials", "invalid-credentials"],
  // Auth refuses a sign-in of a blocked or banned account (its `banned_until` is in the future).
  ["user_banned", "restricted"],
  ["email_not_confirmed", "email-not-confirmed"],
  ["over_request_rate_limit", "rate-limited"],
  ["over_email_send_rate_limit", "rate-limited"],
  ["weak_password", "weak-password"],
]);

const HTTP_TOO_MANY_REQUESTS = 429;

function readProperty(error: unknown, key: "code" | "status" | "message"): unknown {
  return typeof error === "object" && error !== null && key in error
    ? (error as Record<typeof key, unknown>)[key]
    : undefined;
}

/** Whether a sign-up error is the hook's rejection of a banned address, not any other failure. */
export function isBannedSignUpRejection(error: unknown): boolean {
  return (
    readProperty(error, "status") === BANNED_SIGNUP_REJECTION.status &&
    readProperty(error, "message") === BANNED_SIGNUP_REJECTION.message
  );
}

/**
 * Maps a Supabase auth error (or anything else) to the failure the forms show.
 * The only place a missing config becomes `unavailable` (design D7).
 */
export function classifyAuthError(error: unknown): AuthFailure {
  const code = readProperty(error, "code");
  const byCode = typeof code === "string" ? FAILURE_BY_CODE.get(code) : undefined;
  if (byCode) return byCode;
  if (readProperty(error, "status") === HTTP_TOO_MANY_REQUESTS) return "rate-limited";
  if (error instanceof SupabaseConfigError) return "unavailable";
  return "unknown";
}
