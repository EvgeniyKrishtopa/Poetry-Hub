import { redirect } from "next/navigation";

import { SESSION_STATE } from "@/shared/config/constants";
import { Alert } from "@/shared/ui";

import { checkRestriction } from "../../dal/restriction-check";
import { getSessionState } from "../../dal/current-user";
import { getFailureMessage } from "../../model/auth-messages";
import { RECOVERY_FAILED_TARGET } from "../../model/confirm-target";
import { parseResetStatus } from "../../model/reset-status";
import { PasswordResetDone } from "../PasswordResetDone/PasswordResetDone";
import { ResetPasswordForm } from "../ResetPasswordForm/ResetPasswordForm";
import type { ResetPasswordPageProps } from "../ResetPasswordPage/ResetPasswordPage.types";

/**
 * What `/reset-password` shows, read per request (password-recovery design D4): the done notice for a `status`
 * value, which needs no session; otherwise the session decides. Signed out, and a restricted or expired caller, are
 * sent to the dead-link notice with no wording about a block (FR-10); a check that cannot tell shows the
 * unavailable alert and no form.
 */
export async function ResetPasswordContent({ status }: ResetPasswordPageProps) {
  const awaitedStatus = await status;
  const doneStatus = parseResetStatus(awaitedStatus);
  if (doneStatus !== undefined) return <PasswordResetDone status={doneStatus} />;

  const unavailable = <Alert tone="danger">{getFailureMessage("update-password", "unavailable")}</Alert>;

  const session = await getSessionState();
  // Outside every try: `redirect` throws NEXT_REDIRECT.
  if (session.state === SESSION_STATE.signedOut) redirect(RECOVERY_FAILED_TARGET);
  if (session.state === SESSION_STATE.unknown) return unavailable;

  const restriction = await checkRestriction();
  if (restriction === "restricted" || restriction === "unauthenticated") redirect(RECOVERY_FAILED_TARGET);
  if (restriction === "unknown") return unavailable;

  return <ResetPasswordForm />;
}
