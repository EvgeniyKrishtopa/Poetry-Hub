import { requestRecoveryAction } from "../../actions/auth.actions";
import type { RecoveryRequestResult } from "../../model/auth.types";
import { toRecoveryRequestResult } from "../../model/form-state";

/** Sends the address only: the password field is never read, so it cannot reach the action (FR-2). */
export async function submitRecoveryRequest(email: string): Promise<RecoveryRequestResult> {
  const result = await requestRecoveryAction({ email });
  return toRecoveryRequestResult(result);
}
