import "server-only";

export type WebhookVerification = "ok" | "unauthorized" | "not-configured";

/**
 * Compares the `x-contentful-webhook-secret` header with `CONTENTFUL_REVALIDATE_SECRET`
 * in constant time. Fails closed: an unset or empty secret is `not-configured`.
 */
export function verifyWebhookSecret(headerValue: string | null): WebhookVerification {
  throw new Error("not implemented");
}
