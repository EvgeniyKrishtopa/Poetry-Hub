// implements FR-9 of add-contentful-home-greeting
import { revalidateTag } from "next/cache";

import { CONTENTFUL_CACHE_TAG, verifyWebhookSecret } from "@/shared/lib/contentful";

const WEBHOOK_SECRET_HEADER = "x-contentful-webhook-secret";
const HTTP_UNAUTHORIZED = 401;
const HTTP_SERVICE_UNAVAILABLE = 503;

/**
 * Contentful publish webhook. Only POST is exported, so Next answers 405 for other methods.
 * ok → revalidateTag(CONTENTFUL_CACHE_TAG, { expire: 0 }) + 200; unauthorized → 401; not-configured → 503.
 */
export async function POST(request: Request): Promise<Response> {
  const verification = verifyWebhookSecret(request.headers.get(WEBHOOK_SECRET_HEADER));

  if (verification === "not-configured") {
    // No header value or secret in the log (implements NFR-1 of add-contentful-home-greeting).
    console.error("[contentful] revalidation secret is not configured");
    return Response.json(
      { revalidated: false, error: verification },
      { status: HTTP_SERVICE_UNAVAILABLE },
    );
  }

  if (verification === "unauthorized") {
    return Response.json({ revalidated: false, error: verification }, { status: HTTP_UNAUTHORIZED });
  }

  // expire: 0, not "max": the next request must block on fresh data (implements NFR-2).
  revalidateTag(CONTENTFUL_CACHE_TAG, { expire: 0 });
  return Response.json({ revalidated: true });
}
