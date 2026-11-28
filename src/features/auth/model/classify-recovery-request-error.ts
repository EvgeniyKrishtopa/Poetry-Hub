import { SupabaseConfigError } from "@/shared/lib/supabase";

import { AUTH_ERROR_CODE, HTTP_TOO_MANY_REQUESTS } from "./auth.constants";
import type { RecoveryRequestFailure } from "./auth.types";
import { readErrorProperty } from "./read-error-property";

const ANSWER_BY_CODE: ReadonlyMap<string, "sent" | RecoveryRequestFailure> = new Map([
  // Supabase refuses a repeat letter only for an address that has an account, so showing it would reveal the account.
  [AUTH_ERROR_CODE.overEmailSendRateLimit, "sent"],
  [AUTH_ERROR_CODE.overRequestRateLimit, "rate-limited"],
  // Auth checks the captcha before it looks up any address, so saying so reveals no account.
  [AUTH_ERROR_CODE.captchaFailed, "captcha"],
]);

/**
 * What `requestRecoveryAction` answers for a `resetPasswordForEmail` error: `sent` for the per-address refusal, so
 * the answer never depends on the address. An error with a code is decided by the code alone, and a code that is not
 * listed is `unknown` even with HTTP 429, so a renamed per-address code cannot show the known-address answer. The
 * status decides only when there is no code (password-recovery design D3).
 */
export function classifyRecoveryRequestError(error: unknown): "sent" | RecoveryRequestFailure {
  const code = readErrorProperty(error, "code");
  const hasCode = typeof code === "string" && code !== "";
  if (hasCode) return ANSWER_BY_CODE.get(code) ?? "unknown";

  if (readErrorProperty(error, "status") === HTTP_TOO_MANY_REQUESTS) return "rate-limited";
  if (error instanceof SupabaseConfigError) return "unavailable";
  return "unknown";
}
