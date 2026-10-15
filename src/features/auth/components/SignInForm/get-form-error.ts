import { getFailureMessage } from "../../model/auth-messages";
import type { SignInFormState } from "../../model/auth.types";

/** The failed submission's message; before any submission, the page-provided `initialError`. */
export function getFormError(state: SignInFormState, initialError?: string): string | undefined {
  if (state.status === "failed") return getFailureMessage("sign-in", state.failure);
  if (state.status === "idle") return initialError;
  return undefined;
}
