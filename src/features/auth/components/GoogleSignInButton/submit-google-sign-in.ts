import type { GoogleSignInButtonState } from "../../model/auth.types";

/** `useActionState`'s action for the Google button: success never returns, the action redirects to Google. */
export async function submitGoogleSignIn(
  previous: GoogleSignInButtonState,
  formData: FormData,
): Promise<GoogleSignInButtonState> {
  void previous;
  void formData;
  throw new Error("not implemented");
}
