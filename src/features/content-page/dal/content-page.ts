import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { CONTENTFUL_CACHE_TAG, ContentfulError, contentfulQuery } from "@/shared/lib/contentful";

import { contentPageCollectionResponseSchema } from "../model/content-page.schema";
import type { ContentPageFailureReason, ContentPageKey, ContentPageResult } from "../model/content-page.types";

const CONTENT_PAGE_QUERY = /* GraphQL */ `
  query ContentPage($key: String!) {
    greetingCollection(where: { key: $key }, limit: 1) {
      items {
        key
        title
        message
      }
    }
  }
`;

// Repeats home's mapping and redaction rule on purpose (design R2).
/** Only `auth` and `http` statuses are worth logging; the rest carry none or add nothing. */
function statusToLog(error: ContentfulError): number | undefined {
  return error.kind === "auth" || error.kind === "http" ? error.status : undefined;
}

// One log line per failure: the key (a public constant that tells pages apart), the reason, and the
// status; never payloads or secrets (design D6).
function fail(key: ContentPageKey, reason: ContentPageFailureReason, status?: number): ContentPageResult {
  console.error("[contentful] content page failed", status === undefined ? { key, reason } : { key, reason, status });
  return { ok: false, reason };
}

/**
 * Loads and validates the entry with the given key. Contentful failures become `{ ok: false, reason }`
 * values, so they never cross the cache scope as throws; other errors are rethrown.
 */
async function readContentPage(key: ContentPageKey): Promise<ContentPageResult> {
  let data: unknown;
  try {
    data = await contentfulQuery(CONTENT_PAGE_QUERY, { key });
  } catch (error) {
    if (error instanceof ContentfulError) return fail(key, error.kind, statusToLog(error));
    throw error;
  }

  const parsed = contentPageCollectionResponseSchema.safeParse(data);
  if (!parsed.success) return fail(key, "validation");

  const [entry] = parsed.data.greetingCollection.items;
  if (!entry) return fail(key, "not-found");

  return { ok: true, entry };
}

/**
 * Reads one content page's entry in its own cache scope, tagged for the publish webhook. The key is an
 * argument, so it is part of the cache key: each page has its own entry. A success lives for minutes;
 * a failure for seconds, so it is never frozen into the prerendered shell (design D2).
 */
export async function getContentPage(key: ContentPageKey): Promise<ContentPageResult> {
  "use cache";
  cacheTag(CONTENTFUL_CACHE_TAG);

  const result = await readContentPage(key);
  // Separate calls: cacheLife's typed overloads take each profile name as a literal.
  if (result.ok) cacheLife("minutes");
  else cacheLife("seconds");
  return result;
}
