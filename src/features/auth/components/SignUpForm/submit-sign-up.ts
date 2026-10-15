import { signUpAction } from "../../actions/auth.actions";
import type { SignUpFormState } from "../../model/auth.types";
import { readCredentials, toSignUpFormState } from "../../model/form-state";

/** The password is passed on to the action, never kept in state. */
export async function submitSignUp(_previous: SignUpFormState, formData: FormData): Promise<SignUpFormState> {
  const credentials = readCredentials(formData);
  return toSignUpFormState(await signUpAction(credentials), credentials.email);
}
