import { getLoginErrorMessage } from "../../model/auth-messages";
import { RECOVERY_FAILED_ERROR } from "../../model/auth.constants";
import { SignInForm } from "../SignInForm/SignInForm";

import type { SignInFormWithErrorProps } from "./SignInFormWithError.types";

/**
 * The sign-in form with the alert that `/login?error=` asks for; a dead recovery link also brings the recovery
 * offer. Rendered inside `SignInPanel`'s Suspense.
 */
export async function SignInFormWithError({ error }: SignInFormWithErrorProps) {
  const awaitedError = await error;
  const offerOnLoad = awaitedError === RECOVERY_FAILED_ERROR;
  return <SignInForm initialError={getLoginErrorMessage(awaitedError)} offerOnLoad={offerOnLoad} />;
}
