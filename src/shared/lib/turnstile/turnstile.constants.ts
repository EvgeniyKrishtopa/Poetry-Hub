import "server-only";

/** The server-only secret key's variable name (never `NEXT_PUBLIC_`). */
export const TURNSTILE_SECRET_KEY_ENV = "TURNSTILE_SECRET_KEY";

export const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** How long a `siteverify` call may take before it counts as a `timeout` failure. */
export const TURNSTILE_REQUEST_TIMEOUT_MS = 10_000;

/** The `DOMException` name `AbortSignal.timeout` rejects with once that time is up. */
export const TIMEOUT_ERROR_NAME = "TimeoutError";

/** A secret as Cloudflare issues it, test secrets included (`1x000…AA`): a digit, `x`, then key characters. */
export const TURNSTILE_SECRET_PATTERN = /^\dx[A-Za-z0-9_-]+$/;
