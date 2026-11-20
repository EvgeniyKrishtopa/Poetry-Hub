import "server-only";

import type { EMAIL_ENV } from "./email.constants";

type EmailEnvName = (typeof EMAIL_ENV)[keyof typeof EMAIL_ENV];

interface EmailConfig {
  readonly apiKey: string;
  readonly from: string;
}

/** A missing or malformed variable is named, never echoed. */
export type EmailConfigResult =
  { readonly ok: true; readonly config: EmailConfig } | { readonly ok: false; readonly variable: EmailEnvName };

export interface SendEmailInput {
  readonly to: string;
  readonly subject: string;
  /** Plain text only: nothing in it is read as markup. */
  readonly text: string;
  /** Sent as the `Idempotency-Key` header, so a retry of the same request is not delivered twice. */
  readonly idempotencyKey: string;
}

export type EmailFailureReason = "config" | "timeout" | "network" | "conflict" | "http";

/**
 * `conflict` is a 409 saying the key was already used with a different body, which proves an earlier request with that
 * key was accepted. Any other 409 (a request still in progress, or a body that can't be read) is `http` with status 409.
 */
export type EmailSendResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: EmailFailureReason; readonly status?: number };
