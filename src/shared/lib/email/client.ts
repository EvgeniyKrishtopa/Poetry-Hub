import "server-only";

import { readEmailConfig } from "./config";
import {
  EMAIL_API_URL,
  EMAIL_REQUEST_TIMEOUT_MS,
  HTTP_STATUS_CONFLICT,
  IDEMPOTENCY_KEY_HEADER,
  TIMEOUT_ERROR_NAME,
} from "./email.constants";
import type { EmailSendResult, SendEmailInput } from "./email.types";

/**
 * Sends one plain-text email. Failures come back as values; the key, the address and the body are never
 * logged, thrown or returned.
 */
export async function sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
  const configResult = readEmailConfig();
  if (!configResult.ok) return { ok: false, reason: "config" };
  const { apiKey, from } = configResult.config;

  let response: Response;
  try {
    // Only `text`, never `html`: nothing in the message is read as markup.
    response = await fetch(EMAIL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        [IDEMPOTENCY_KEY_HEADER]: input.idempotencyKey,
      },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text }),
      signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    return toThrownFailure(error);
  }

  // Read the body on every status, so the connection is released. The timeout signal still covers
  // this read, so a slow body is a `timeout`, not an `http` failure. The text itself is dropped:
  // an error body can echo the address.
  try {
    await response.text();
  } catch (error) {
    return toThrownFailure(error);
  }

  if (response.ok) return { ok: true };
  if (response.status === HTTP_STATUS_CONFLICT) return { ok: false, reason: "conflict" };
  return { ok: false, reason: "http", status: response.status };
}

/** A thrown request or body read: `timeout` when the signal fired, `network` for anything else. */
function toThrownFailure(error: unknown): EmailSendResult {
  // The error may carry the key or the address: only its name is inspected.
  const isTimeout = error instanceof DOMException && error.name === TIMEOUT_ERROR_NAME;
  return { ok: false, reason: isTimeout ? "timeout" : "network" };
}
