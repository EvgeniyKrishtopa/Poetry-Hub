import { GOOGLE_FAILED_MESSAGE } from "../../model/auth-messages";
import type { GoogleSignInButtonState } from "../../model/auth.types";

/**
 * The one text of the Google alert slot (google-sign-in design D6): the URL's notice until the button is
 * pressed, then only the button's own start result.
 */
export function getGoogleAlert(
  state: GoogleSignInButtonState,
  pending: boolean,
  initialError: string | undefined,
): string | undefined {
  if (state.status === "failed") return GOOGLE_FAILED_MESSAGE;
  if (pending) return undefined;
  return initialError;
}
