import "server-only";

/** Names of the server-only environment variables the client reads (never `NEXT_PUBLIC_`). */
export const EMAIL_ENV = {
  apiKey: "RESEND_API_KEY",
  from: "EMAIL_FROM",
} as const;

export const EMAIL_API_URL = "https://api.resend.com/emails";

/** How long one send may take before it counts as a `timeout` failure; the admin waits for up to two attempts. */
export const EMAIL_REQUEST_TIMEOUT_MS = 5_000;

/** The header that makes a repeated request return the first result instead of sending again. */
export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

/** The answer for a key that is still in progress, or was used with a different body. */
export const HTTP_STATUS_CONFLICT = 409;

/**
 * The error `name` Resend gives a 409 when the key was already used with a different body. A failed request is not
 * stored, so only an accepted one can cause it. The other 409, `concurrent_idempotent_requests`, means in progress.
 */
export const IDEMPOTENCY_KEY_REUSED_ERROR_NAME = "invalid_idempotent_request";

/** The `DOMException` name `AbortSignal.timeout` rejects with once that time is up. */
export const TIMEOUT_ERROR_NAME = "TimeoutError";

/** An API key as Resend issues it: the `re_` prefix, then characters with no whitespace. */
export const EMAIL_API_KEY_PATTERN = /^re_\S+$/;

/** A sender as `name@host.tld` or `Display Name <name@host.tld>`; a line break would end the header early. */
export const EMAIL_FROM_PATTERN = /^(?:[^<>\r\n]+<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>|[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)$/;
