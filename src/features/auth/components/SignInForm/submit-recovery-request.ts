import { requestRecoveryAction } from "../../actions/auth.actions";
import type { RecoveryRequestResult } from "../../model/auth.types";
import { toRecoveryRequestResult } from "../../model/form-state";

const NETWORK_FAILURE: RecoveryRequestResult = { status: "failed", failure: "unknown" };

/**
 * Sends the address only: the password field is never read, so it cannot reach the action (FR-2). A dropped
 * connection is a `TypeError` from `fetch` and becomes the generic failure; any other error is not ours to hide.
 */
export async function submitRecoveryRequest(email: string): Promise<RecoveryRequestResult> {
  try {
    const result = await requestRecoveryAction({ email });
    return toRecoveryRequestResult(result);
  } catch (error) {
    if (error instanceof TypeError) return NETWORK_FAILURE;
    throw error;
  }
}
