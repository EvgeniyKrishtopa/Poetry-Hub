import "server-only";

import { sendEmail, type EmailSendResult } from "@/shared/lib/email";

import { logNotice } from "../dal/violation-rpc";
import { buildActionNoticeEmail } from "../model/action-notice-copy";
import { isTransientEmailFailure } from "../model/email-failure";
import { NOTICE_LOG_OUTCOME } from "../model/violation.constants";
import type { ActionNoticeKind, ActionNoticeResult, NoticeEmailContent, SendActionNoticeInput } from "../model/violation.types";

/** Every notice gets its own key, so two different notices are never mistaken for one repeated request. */
const NOTICE_KEY_PREFIX = "action-notice-";

/** One send and, after a transient failure, one more under the same key, so a first send that landed isn't repeated. */
async function sendWithOneRetry(to: string, message: NoticeEmailContent, idempotencyKey: string): Promise<EmailSendResult> {
  const request = { to, subject: message.subject, text: message.text, idempotencyKey };
  const first = await sendEmail(request);
  if (first.ok || !isTransientEmailFailure(first)) return first;

  const retry = await sendEmail(request);
  // The first request may have been accepted after all: a key conflict on the retry says so.
  if (!retry.ok && retry.reason === "conflict") return { ok: true };
  return retry;
}

/** The log line holds the notice kind and the failure only: never the address, the text or a title (NFR-1). */
function logNotSent(kind: ActionNoticeKind, cause: string): void {
  console.error(`[admin] action notice not sent: ${kind}: ${cause}`);
}

async function deliver(input: SendActionNoticeInput): Promise<ActionNoticeResult> {
  if (input.email === null) {
    logNotSent(input.kind, "no-address");
    return { outcome: "failed", cause: "no-address" };
  }

  const result = await sendWithOneRetry(
    input.email,
    buildActionNoticeEmail(input),
    `${NOTICE_KEY_PREFIX}${crypto.randomUUID()}`,
  );
  if (result.ok) return { outcome: "sent" };

  logNotSent(input.kind, result.reason === "http" ? `http ${result.status ?? "unknown"}` : result.reason);
  return { outcome: "failed", cause: result.reason };
}

/**
 * The standard email after a restricting action, never decisive for the action: one send, one retry on a
 * transient failure under the same key, then `admin_log_notice` best-effort (design D5, FR-9, FR-14).
 */
export async function sendActionNotice(input: SendActionNoticeInput): Promise<ActionNoticeResult> {
  const result = await deliver(input);
  await logNotice(
    input.userId,
    input.kind,
    result.outcome === "sent" ? NOTICE_LOG_OUTCOME.sent : NOTICE_LOG_OUTCOME.failed,
  );
  return result;
}
