import "server-only";

export type RecoveryCheckResult = "recovery" | "not-recovery" | "unknown";

/** The current session's answer to "may it set a new password"; an outage is `unknown`. */
export async function checkRecoverySession(): Promise<RecoveryCheckResult> {
  throw new Error("not implemented");
}
