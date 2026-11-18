import "server-only";

import { sendEmail, type EmailSendResult } from "@/shared/lib/email";

import { logNotice } from "../dal/violation-rpc";
import { buildActionNoticeEmail } from "../model/action-notice-copy";
import { isTransientEmailFailure } from "../model/email-failure";
import { NOTICE_LOG_OUTCOME } from "../model/violation.constants";
import type { ActionNoticeKind, ActionNoticeResult, NoticeEmailContent, SendActionNoticeInput } from "../model/violation.types";

/** Every notice gets its own key, so two different notices are never mistaken for one repeated request. */
const NOTICE_KEY_PREFIX = "action-notice-";

/**
 * Sends the email once and, only after a transient failure, once more under the same idempotency key, so a first
 * request that was in fact accepted is not delivered twice. Returns the last attempt's result; a key conflict on the
 * retry counts as sent, because only an accepted request can cause it.
 */
async function sendWithOneRetry(to: string, message: NoticeEmailContent, idempotencyKey: string): Promise<EmailSendResult> {
  const request = { to, subject: message.subject, text: message.text, idempotencyKey };
  const first = await sendEmail(request);
  if (first.ok || !isTransientEmailFailure(first)) return first;

  const retry = await sendEmail(request);
  // The first request may have been accepted after all: a key conflict on the retry says so.
  if (!retry.ok && retry.reason === "conflict") return { ok: true };
  return retry;
}

/**
 * Logs that a notice was not sent, as the notice kind and the failure reason only: never the address, the text or a
 * title (NFR-1).
 */
function logNotSent(kind: ActionNoticeKind, cause: string): void {
  console.error(`[admin] action notice not sent: ${kind}: ${cause}`);
}

/**
 * Logs that the notice step threw, as the notice kind and the error's class only: the error's message could carry the
 * address or the text.
 */
function logUnexpected(kind: ActionNoticeKind, error: unknown): void {
  console.error(`[admin] action notice step threw: ${kind}: ${error instanceof Error ? error.name : typeof error}`);
}

/**
 * Builds the email for a notice and sends it. Answers `failed` with its cause when there is no address or the send
 * failed, and `sent` otherwise. It does not catch throws: `sendActionNotice` does.
 */
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
 * Sends the standard email after a block, ban or admin delete, and records what happened. Never decisive for the
 * action: it always answers `sent` or `failed` with a cause, never throws, and never undoes the action. Steps: one
 * send with one retry on a transient failure under the same key, then `admin_log_notice` best-effort (design D5,
 * FR-9, FR-14).
 */
export async function sendActionNotice(input: SendActionNoticeInput): Promise<ActionNoticeResult> {
  // `sendEmail` and `logNotice` return failures as values, so neither should throw. The action has already
  // committed, though, so a throw anywhere here still must not reach the admin as a failed action (FR-14).
  let result: ActionNoticeResult;
  try {
    result = await deliver(input);
  } catch (error) {
    logUnexpected(input.kind, error);
    result = { outcome: "failed", cause: "unexpected" };
  }

  try {
    await logNotice(
      input.userId,
      input.kind,
      result.outcome === "sent" ? NOTICE_LOG_OUTCOME.sent : NOTICE_LOG_OUTCOME.failed,
    );
  } catch (error) {
    logUnexpected(input.kind, error);
  }
  return result;
}
