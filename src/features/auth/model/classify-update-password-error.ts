import type { UpdatePasswordFailure } from "./auth.types";
import { classifyAuthError } from "./classify-auth-error";

/**
 * What `updatePasswordAction` answers for an `updateUser` error. `restricted` (`user_banned`: a token Supabase still
 * accepted for a banned account) is `unknown`, because the sign-in text of `restricted` speaks of a block, and no
 * step of the recovery flow may (password-recovery design D5, D8). Kinds the update flow never shows read as `unknown`.
 */
export function classifyUpdatePasswordError(error: unknown): UpdatePasswordFailure {
  const failure = classifyAuthError(error);
  switch (failure) {
    case "same-password":
    case "weak-password":
    case "rate-limited":
    case "unavailable":
      return failure;
    default:
      return "unknown";
  }
}
