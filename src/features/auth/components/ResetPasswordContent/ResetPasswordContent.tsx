import { redirect } from "next/navigation";

import { Alert } from "@/shared/ui";

import { checkRecoverySession } from "../../dal/recovery-check";
import { checkRestriction } from "../../dal/restriction-check";
import { getFailureMessage } from "../../model/auth-messages";
import { RECOVERY_FAILED_TARGET } from "../../model/confirm-target";
import { parseResetStatus } from "../../model/reset-status";
import { PasswordResetDone } from "../PasswordResetDone/PasswordResetDone";
import { ResetPasswordForm } from "../ResetPasswordForm/ResetPasswordForm";
import type { ResetPasswordPageProps } from "../ResetPasswordPage/ResetPasswordPage.types";

/**
 * What `/reset-password` shows, read per request (password-recovery design D4): the done notice for a `status`
 * value, which needs no session; otherwise the session decides. Anything but a recent recovery session (signed out
 * included), and a restricted or expired caller, are sent to the dead-link notice with no wording about a block
 * (FR-10); a check that cannot tell shows the unavailable alert and no form.
 */
export async function ResetPasswordContent({ status }: ResetPasswordPageProps) {
  const awaitedStatus = await status;
  const doneStatus = parseResetStatus(awaitedStatus);
  if (doneStatus !== undefined) return <PasswordResetDone status={doneStatus} />;

  const unavailable = <Alert tone="danger">{getFailureMessage("update-password", "unavailable")}</Alert>;

  const recovery = await checkRecoverySession();
  // Outside every try: `redirect` throws NEXT_REDIRECT.
  if (recovery === "not-recovery") redirect(RECOVERY_FAILED_TARGET);
  if (recovery === "unknown") return unavailable;

  const restriction = await checkRestriction();
  if (restriction === "restricted" || restriction === "unauthenticated") redirect(RECOVERY_FAILED_TARGET);
  if (restriction === "unknown") return unavailable;

  return <ResetPasswordForm />;
}
