import "server-only";

/** Names of the server-only environment variables the client reads (never `NEXT_PUBLIC_`). */
export const EMAIL_ENV = {
  apiKey: "RESEND_API_KEY",
  from: "EMAIL_FROM",
} as const;

export const EMAIL_API_URL = "https://api.resend.com/emails";

/** How long one send may take before it counts as a `timeout` failure; the admin waits for up to two attempts. */
export const EMAIL_REQUEST_TIMEOUT_MS = 5_000;
