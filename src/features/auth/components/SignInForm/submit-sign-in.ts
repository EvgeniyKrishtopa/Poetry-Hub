import { signInAction } from "../../actions/auth.actions";
import type { SignInFormState } from "../../model/auth.types";
import { readCredentials, toSignInFormState } from "../../model/form-state";

/** Success never returns: the action redirects to `/`. The password is passed on, never kept. */
export async function submitSignIn(
  _previous: SignInFormState,
  formData: FormData,
  captchaToken: string,
): Promise<SignInFormState> {
  const credentials = readCredentials(formData);
  const result = await signInAction({ ...credentials, captchaToken });
  return toSignInFormState(result, credentials.email);
}
