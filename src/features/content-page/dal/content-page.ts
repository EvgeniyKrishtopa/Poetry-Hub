import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { CONTENTFUL_CACHE_TAG, ContentfulError, contentfulQuery } from "@/shared/lib/contentful";

import { contentPageCollectionResponseSchema } from "../model/content-page.schema";
import type { ContentPageFailureReason, ContentPageResult } from "../model/content-page.types";

const ABOUT_PAGE_KEY = "about_page";

const ABOUT_PAGE_QUERY = /* GraphQL */ `
  query AboutPage($key: String!) {
    greetingCollection(where: { key: $key }, limit: 1) {
      items {
        key
        title
        message
      }
    }
  }
`;

// Repeats home's mapping and redaction rule on purpose (design R7).
/** Only `auth` and `http` statuses are worth logging; the rest carry none or add nothing. */
function statusToLog(error: ContentfulError): number | undefined {
  return error.kind === "auth" || error.kind === "http" ? error.status : undefined;
}

// One log line per failure: only the reason and status, never payloads or secrets.
function fail(reason: ContentPageFailureReason, status?: number): ContentPageResult {
  console.error("[contentful] about page failed", status === undefined ? { reason } : { reason, status });
  return { ok: false, reason };
}

/**
 * Loads and validates the `about_page` entry. Contentful failures become `{ ok: false, reason }`
 * values, so they never cross the cache scope as throws; other errors are rethrown.
 */
async function readContentPage(): Promise<ContentPageResult> {
  let data: unknown;
  try {
    data = await contentfulQuery(ABOUT_PAGE_QUERY, { key: ABOUT_PAGE_KEY });
  } catch (error) {
    if (error instanceof ContentfulError) return fail(error.kind, statusToLog(error));
    throw error;
  }

  const parsed = contentPageCollectionResponseSchema.safeParse(data);
  if (!parsed.success) return fail("validation");

  const [entry] = parsed.data.greetingCollection.items;
  if (!entry) return fail("not-found");

  return { ok: true, entry };
}

/**
 * Reads the `about_page` entry in its own cache scope, tagged for the publish webhook. A success
 * lives for minutes; a failure for seconds, so it is never frozen into the prerendered shell (design D2).
 */
export async function getContentPage(): Promise<ContentPageResult> {
  "use cache";
  cacheTag(CONTENTFUL_CACHE_TAG);

  const result = await readContentPage();
  // Separate calls: cacheLife's typed overloads take each profile name as a literal.
  if (result.ok) cacheLife("minutes");
  else cacheLife("seconds");
  return result;
}
