import { startGoogleSignInAction } from "../../actions/auth.actions";
import type { GoogleFlow, GoogleSignInButtonState } from "../../model/auth.types";

const FAILED_START: GoogleSignInButtonState = { status: "failed" };

/**
 * `useActionState`'s action for the Google button. Success never returns: the action redirects to Google, so any
 * response that comes back, a validation or server error included, is a failed start (google-sign-in design D7).
 */
export async function submitGoogleSignIn(from: GoogleFlow): Promise<GoogleSignInButtonState> {
  await startGoogleSignInAction({ from });
  return FAILED_START;
}
