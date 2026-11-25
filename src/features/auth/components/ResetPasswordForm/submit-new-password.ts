import { updatePasswordAction } from "../../actions/auth.actions";
import type { ResetPasswordFormState } from "../../model/auth.types";
import { readNewPassword, toResetPasswordFormState } from "../../model/form-state";

const NETWORK_FAILURE: ResetPasswordFormState = { status: "failed", failure: "unknown" };

/**
 * Success never returns: the action redirects to `/reset-password?status=…`. The password is passed on, never kept.
 * A dropped connection is a `TypeError` from `fetch` and becomes the generic failure; every other error, a
 * redirect's included, is rethrown so it still reaches Next.
 */
export async function submitNewPassword(
  _previous: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const newPassword = readNewPassword(formData);
  try {
    const result = await updatePasswordAction(newPassword);
    return toResetPasswordFormState(result);
  } catch (error) {
    if (error instanceof TypeError) return NETWORK_FAILURE;
    throw error;
  }
}
