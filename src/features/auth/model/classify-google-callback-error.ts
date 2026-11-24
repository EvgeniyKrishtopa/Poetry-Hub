import type { GoogleCallbackParams, GoogleFailureReason } from "./auth.types";

/**
 * Why Supabase Auth refused a Google sign-in, from the callback's parameters or an exchange error's code.
 * Reads the error code before the generic `error`, and a block before a cancel (google-sign-in design D3).
 */
export function classifyGoogleCallbackError(
  params: Pick<GoogleCallbackParams, "error" | "errorCode" | "errorDescription">,
): GoogleFailureReason {
  void params;
  throw new Error("not implemented");
}
