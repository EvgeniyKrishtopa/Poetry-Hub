import "server-only";

import type { PasswordResetAllowance } from "../model/auth.types";

/**
 * Counts one attempt against the `password_reset` scope of `consume_write_allowance` (ADR 0007). The feature's own
 * copy of the one-scope helper; anything but a boolean answer is `failed`, which never allows an update, and a
 * refusal is a value, not a throw (password-recovery design D5, D6).
 */
export async function consumePasswordResetAllowance(): Promise<PasswordResetAllowance> {
  throw new Error("not implemented");
}
