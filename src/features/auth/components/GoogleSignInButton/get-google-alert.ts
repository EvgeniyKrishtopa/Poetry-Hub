import { GOOGLE_FAILED_MESSAGE } from "../../model/auth-messages";
import type { GoogleSignInButtonState } from "../../model/auth.types";

/**
 * The one text of the Google alert slot (google-sign-in design D6): the URL's notice until the button is
 * pressed, then only the button's own start result. While a start runs the slot is empty, so an earlier
 * failure never sits next to a busy button.
 */
export function getGoogleAlert(
  state: GoogleSignInButtonState,
  pending: boolean,
  initialError: string | undefined,
): string | undefined {
  if (pending) return undefined;
  if (state.status === "failed") return GOOGLE_FAILED_MESSAGE;
  return initialError;
}
