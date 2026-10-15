import { Suspense } from "react";

import { SignInForm } from "../SignInForm/SignInForm";
import { SignInFormWithError } from "../SignInFormWithError/SignInFormWithError";

import type { SignInPanelProps } from "./SignInPanel.types";

/**
 * The `/login` sign-in form. `error` is request-time data under Cache Components, so it is awaited
 * only inside the Suspense boundary. The fallback is the same form without the alert, so the static
 * shell already holds a usable form.
 */
export function SignInPanel({ error }: SignInPanelProps) {
  return (
    <Suspense fallback={<SignInForm />}>
      <SignInFormWithError error={error} />
    </Suspense>
  );
}
