import { SupabaseConfigError } from "@/shared/lib/supabase";

import type { AuthFailure } from "./auth.types";

const FAILURE_BY_CODE: ReadonlyMap<string, AuthFailure> = new Map([
  ["invalid_credentials", "invalid-credentials"],
  ["email_not_confirmed", "email-not-confirmed"],
  ["over_request_rate_limit", "rate-limited"],
  ["over_email_send_rate_limit", "rate-limited"],
  ["weak_password", "weak-password"],
]);

const HTTP_TOO_MANY_REQUESTS = 429;

function readProperty(error: unknown, key: "code" | "status"): unknown {
  return typeof error === "object" && error !== null && key in error
    ? (error as Record<typeof key, unknown>)[key]
    : undefined;
}

/**
 * Maps a Supabase auth error (or anything else) to the failure the forms show.
 * The only place a missing config becomes `unavailable` (design D7).
 */
// implements FR-2 of add-supabase-auth
// implements FR-4 of add-supabase-auth
export function classifyAuthError(error: unknown): AuthFailure {
  const code = readProperty(error, "code");
  const byCode = typeof code === "string" ? FAILURE_BY_CODE.get(code) : undefined;
  if (byCode) return byCode;
  if (readProperty(error, "status") === HTTP_TOO_MANY_REQUESTS) return "rate-limited";
  if (error instanceof SupabaseConfigError) return "unavailable";
  return "unknown";
}
