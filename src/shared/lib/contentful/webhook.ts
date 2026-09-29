import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export type WebhookVerification = "ok" | "unauthorized" | "not-configured";

/** Fixed-length digest, so `timingSafeEqual` never sees buffers of different lengths. */
function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// implements FR-9 of add-contentful-home-greeting
// implements NFR-1 of add-contentful-home-greeting
/**
 * Compares the `x-contentful-webhook-secret` header with `CONTENTFUL_REVALIDATE_SECRET`
 * in constant time. Fails closed: an unset or empty secret is `not-configured`.
 */
export function verifyWebhookSecret(headerValue: string | null): WebhookVerification {
  // Read on every call, never at module load, so a missing secret can't break the build.
  const secret = process.env.CONTENTFUL_REVALIDATE_SECRET;
  if (!secret) return "not-configured";
  if (headerValue === null) return "unauthorized";

  return timingSafeEqual(digest(headerValue), digest(secret)) ? "ok" : "unauthorized";
}
