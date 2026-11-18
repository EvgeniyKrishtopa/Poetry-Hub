import { CASE_FAILURE_MESSAGES, WARN_DIALOG_COPY } from "../../model/admin-messages";
import type { AdminNotice, SendWarningActionResult } from "../../model/violation.types";

import type { WarnSettleReason } from "./WarnDialog.types";

/** What the dialog does with an answer: finish, stop because of the case, or stay open with a notice. */
export type WarnOutcome =
  | { readonly kind: "sent" }
  | { readonly kind: "stopped"; readonly reason: WarnSettleReason }
  | { readonly kind: "failed"; readonly notice: AdminNotice; readonly locksMessage: boolean };

const UNKNOWN_OUTCOME: WarnOutcome = {
  kind: "failed",
  notice: { tone: "neutral", text: WARN_DIALOG_COPY.unknownOutcome },
  locksMessage: true,
};

function refused(text: string): WarnOutcome {
  return { kind: "failed", notice: { tone: "danger", text }, locksMessage: false };
}

/**
 * The warning action's answer in the dialog's terms (design D4, FR-11). When the email may have been sent (a timeout,
 * a network error, a server error, an answer that never came) the text is fixed, so a retry carries the same one; a
 * refusal proves nothing was sent, so the field stays editable. The action's own `unavailable` also covers an email
 * that was accepted but not recorded, so it counts as unknown too.
 */
export function classifyWarning(result: SendWarningActionResult): WarnOutcome {
  if (result.ok) return { kind: "sent" };
  if (result.reason === "email-failed") {
    if (result.outcomeUnknown) return UNKNOWN_OUTCOME;
    return refused(result.cause === "config" ? WARN_DIALOG_COPY.notConfigured : WARN_DIALOG_COPY.notSent);
  }

  switch (result.reason) {
    case "already-warned":
    case "wrong-ground":
    case "case-not-found":
    case "already-restricted":
      return { kind: "stopped", reason: result.reason };
    case "unavailable":
      return UNKNOWN_OUTCOME;
    case "no-address":
      return refused(WARN_DIALOG_COPY.noAddress);
    case "content-not-found":
      return refused(CASE_FAILURE_MESSAGES.invalid);
    default:
      return refused(CASE_FAILURE_MESSAGES[result.reason]);
  }
}
