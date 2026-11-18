"use server";

import { sendEmail } from "@/shared/lib/email";

import { markWarned, startWarning } from "../dal/violation-rpc";
import { toFailureReason } from "../model/action-results";
import { isTransientEmailFailure } from "../model/email-failure";
import { toMarkWarnedActionResult, toWarningRefusal } from "../model/violation-action-results";
import { VIOLATION_DB_STATUS } from "../model/violation.constants";
import { sendWarningSchema, type SendWarningInput } from "../model/violation.schema";
import type { SendWarningActionResult } from "../model/violation.types";
import { buildWarningEmail } from "../model/warning-copy";

import { adminActionClient } from "./action-client";
import { checkSession } from "./session-check";

/** The case id is the key: stable across retries, modal reopenings and tabs, and a case is warned once (design D4). */
const WARNING_KEY_PREFIX = "violation-warning-";

/**
 * A log line holds the case id and the reason only: never the address, the message or the key (CR-05, NFR-1). The
 * case id is what lets the owner find a warning that was accepted but not recorded.
 */
function logWarning(caseId: string, what: string): void {
  console.error(`[admin] warning ${what}: case ${caseId}`);
}

/** The steps of design D4, in order; each failure stops the rest. */
async function sendWarning({ caseId, message }: SendWarningInput): Promise<SendWarningActionResult> {
  // 1. The message is already validated by the schema: an empty or over-long one never gets here (FR-6).

  // 2. Session, read again: an ended one and one that can't be checked are told apart.
  const session = await checkSession();
  if (!session.ok) return { ok: false, reason: session.failure };

  // 3. The checks, and the address to send to: the browser never supplies it.
  const start = await startWarning({ caseId });
  if (!start.ok) return { ok: false, reason: toFailureReason(start.failure) };
  if (start.status !== VIOLATION_DB_STATUS.ready) return toWarningRefusal(start.status);

  // 4. One email under the case's key. A conflict means an email for this case was already accepted.
  const frame = buildWarningEmail(message);
  const sent = await sendEmail({
    to: start.email,
    subject: frame.subject,
    text: frame.text,
    idempotencyKey: `${WARNING_KEY_PREFIX}${caseId}`,
  });
  if (!sent.ok && sent.reason !== "conflict") {
    logWarning(caseId, `email not sent (${sent.reason}${sent.status === undefined ? "" : ` ${sent.status}`})`);
    return { ok: false, reason: "email-failed", cause: sent.reason, outcomeUnknown: isTransientEmailFailure(sent) };
  }

  // 5. Marked only now, so a failed send leaves the case waiting. A mark that fails after an accepted email is
  // retried by the admin under the same key, which sends nothing twice.
  const result = toMarkWarnedActionResult(await markWarned({ caseId }));
  if (!result.ok && result.reason !== "already-warned") logWarning(caseId, "email accepted, case not recorded");
  return result;
}

/**
 * Warns the user of a case: validate, session, `admin_start_warning`, one email under the key
 * `violation-warning-<caseId>`, and `admin_mark_warned` only after the email was accepted (design D4).
 */
export const sendWarningAction = adminActionClient
  .inputSchema(sendWarningSchema)
  .action(async ({ parsedInput }): Promise<SendWarningActionResult> => sendWarning(parsedInput));
