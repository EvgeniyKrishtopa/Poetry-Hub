import { getLoginErrorMessage } from "../../model/auth-messages";
import { SignInForm } from "../SignInForm/SignInForm";

import type { SignInFormWithErrorProps } from "./SignInFormWithError.types";

/** The sign-in form with the alert that `/login?error=` asks for. Render it inside a Suspense boundary. */
export async function SignInFormWithError({ searchParams }: SignInFormWithErrorProps) {
  const { error } = await searchParams;
  return <SignInForm initialError={getLoginErrorMessage(error)} />;
}
