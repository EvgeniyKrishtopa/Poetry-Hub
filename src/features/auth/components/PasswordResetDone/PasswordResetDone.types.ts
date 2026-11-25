import type { ResetStatus } from "../../model/auth.types";

export interface PasswordResetDoneProps {
  /** Which notice to show: the old sessions ended, or the sign-out failed. */
  readonly status: ResetStatus;
}
