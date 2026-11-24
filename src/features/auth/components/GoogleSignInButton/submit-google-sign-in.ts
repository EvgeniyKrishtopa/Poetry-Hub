import { unstable_rethrow } from "next/navigation";

import { startGoogleSignInAction } from "../../actions/auth.actions";
import type { GoogleFlow, GoogleSignInButtonState } from "../../model/auth.types";

const FAILED_START: GoogleSignInButtonState = { status: "failed" };

/**
 * `useActionState`'s action for the Google button. Success never returns: the action redirects to Google, so any
 * response that comes back, a validation or server error included, is a failed start (google-sign-in design D7).
 * A call that never reaches the server (the connection drops after the press) is a failed start too, not a page
 * error; only Next's own redirect to Google is let through.
 */
export async function submitGoogleSignIn(from: GoogleFlow): Promise<GoogleSignInButtonState> {
  try {
    await startGoogleSignInAction({ from });
  } catch (error) {
    unstable_rethrow(error);
  }
  return FAILED_START;
}
