import type { RecoveryRequestFailure } from "./auth.types";

/**
 * What `requestRecoveryAction` answers for a `resetPasswordForEmail` error: `sent` for the per-address refusal, so
 * the answer never depends on the address. An error with a code is decided by the code alone; the status decides
 * only when there is no code (password-recovery design D3).
 */
export function classifyRecoveryRequestError(error: unknown): "sent" | RecoveryRequestFailure {
  void error;
  throw new Error("not implemented");
}
