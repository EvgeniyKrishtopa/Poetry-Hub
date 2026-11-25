import { getGoogleErrorMessage } from "../../model/auth-messages";
import { GoogleSignInButton } from "../GoogleSignInButton/GoogleSignInButton";
import type { GoogleSignInPanelProps } from "../GoogleSignInPanel/GoogleSignInPanel.types";

/** The Google button with the notice that `?error=google-*` asks for. Rendered inside `GoogleSignInPanel`'s Suspense. */
export async function GoogleSignInButtonWithError({ from, error }: GoogleSignInPanelProps) {
  const awaitedError = await error;
  const initialError = getGoogleErrorMessage(awaitedError);
  return <GoogleSignInButton from={from} initialError={initialError} />;
}
