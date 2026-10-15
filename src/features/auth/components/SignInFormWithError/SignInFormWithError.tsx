import { getLoginErrorMessage } from "../../model/auth-messages";
import { SignInForm } from "../SignInForm/SignInForm";

import type { SignInFormWithErrorProps } from "./SignInFormWithError.types";

/** The sign-in form with the alert that `/login?error=` asks for. Rendered inside `SignInPanel`'s Suspense. */
export async function SignInFormWithError({ error }: SignInFormWithErrorProps) {
  return <SignInForm initialError={getLoginErrorMessage(await error)} />;
}
