import "server-only";

// getContentfulConfig stays internal: it exposes the raw access token, and only client.ts needs it.
export { CONTENTFUL_CACHE_TAG, contentfulQuery, type ContentfulCacheOptions } from "./client";
export { ContentfulError, type ContentfulErrorKind } from "./errors";
export { verifyWebhookSecret, type WebhookVerification } from "./webhook";
