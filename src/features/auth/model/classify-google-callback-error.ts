import { GOOGLE_CALLBACK_ERROR } from "./auth.constants";
import type { GoogleCallbackParams, GoogleFailureReason } from "./auth.types";

/** Supabase sends some fields present but empty, which task 1.2 recorded as different from absent (`null`). */
const EMPTY_VALUE = "";

/**
 * Why Supabase Auth refused a Google sign-in, from the callback's parameters or an exchange error's code.
 * Reads the error code before the generic `error`, and a block before a cancel, because every recorded refusal
 * carries `error=access_denied` (google-sign-in design D3, task 1.2). Only the exact recorded cancel reads as a
 * cancel: anything unrecognised is `failed`, so a visitor is never told they cancelled when they did not.
 */
export function classifyGoogleCallbackError(
  params: Pick<GoogleCallbackParams, "error" | "errorCode" | "errorDescription">,
): GoogleFailureReason {
  const { error, errorCode, errorDescription } = params;

  if (errorCode === GOOGLE_CALLBACK_ERROR.userBanned) return "blocked";

  const isBannedSignUp =
    errorCode === EMPTY_VALUE && errorDescription === GOOGLE_CALLBACK_ERROR.bannedSignUpDescription;
  if (isBannedSignUp) return "blocked";

  const isCancel =
    error === GOOGLE_CALLBACK_ERROR.accessDenied && errorCode === null && errorDescription === EMPTY_VALUE;
  if (isCancel) return "cancelled";

  return "failed";
}
