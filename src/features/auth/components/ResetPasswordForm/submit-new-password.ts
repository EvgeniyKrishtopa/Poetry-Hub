import { updatePasswordAction } from "../../actions/auth.actions";
import type { ResetPasswordFormState } from "../../model/auth.types";
import { readNewPassword, toResetPasswordFormState } from "../../model/form-state";

/** Success never returns: the action redirects to `/reset-password?status=…`. The password is passed on, never kept. */
export async function submitNewPassword(
  _previous: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const newPassword = readNewPassword(formData);
  const result = await updatePasswordAction(newPassword);
  return toResetPasswordFormState(result);
}
