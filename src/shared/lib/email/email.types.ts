import "server-only";

import type { EMAIL_ENV } from "./email.constants";

export type EmailEnvName = (typeof EMAIL_ENV)[keyof typeof EMAIL_ENV];

export interface EmailConfig {
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

/** `conflict` is HTTP 409: a request with that key is still in flight, or the key was used with a different body. */
export type EmailSendResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: EmailFailureReason; readonly status?: number };
