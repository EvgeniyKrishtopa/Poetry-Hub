import "server-only";

import type { EmailSendResult, SendEmailInput } from "./email.types";

/**
 * Sends one plain-text email. Failures come back as values; the key, the address and the body are never
 * logged, thrown or returned.
 */
export async function sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
  void input;
  throw new Error("not implemented");
}
