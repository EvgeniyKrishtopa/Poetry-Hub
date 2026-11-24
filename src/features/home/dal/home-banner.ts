import "server-only";

import { ContentfulError, contentfulQuery, getContentfulSpaceId } from "@/shared/lib/contentful";

import { createHomeBannerCollectionResponseSchema } from "../model/home-banner.schema";
import type { HomeBannerFailureReason, HomeBannerResult } from "../model/home-banner.types";

// The most recently published entry wins, so a second entry an editor adds is predictable.
const HOME_BANNER_QUERY = /* GraphQL */ `
  query HomeBanner {
    homeBannerCollection(limit: 1, order: sys_publishedAt_DESC) {
      items {
        title
        description
        bannerImage {
          url
        }
      }
    }
  }
`;

// Repeats the greeting reader's mapping and redaction rule on purpose: two readers of a few lines each do not
// justify a shared abstraction (design D1).
/** Only `auth` and `http` statuses are worth logging; the rest carry none or add nothing. */
function statusToLog(error: ContentfulError): number | undefined {
  return error.kind === "auth" || error.kind === "http" ? error.status : undefined;
}

// One log line per failure: only the reason and status, never the title, text, address or any secret.
function fail(reason: HomeBannerFailureReason, status?: number): HomeBannerResult {
  console.error("[contentful] home banner failed", status === undefined ? { reason } : { reason, status });
  return { ok: false, reason };
}

/**
 * Loads and validates the most recently published Home banner. Contentful failures become
 * `{ ok: false, reason }` results (logged once, without secrets); other errors are rethrown.
 */
export async function getHomeBanner(): Promise<HomeBannerResult> {
  let data: unknown;
  let spaceId: string;
  try {
    // The space id comes from the client's own configuration, so an unset one is a `config` failure here too.
    spaceId = getContentfulSpaceId();
    // Relies on the client's 60 s + `contentful` tag defaults.
    data = await contentfulQuery(HOME_BANNER_QUERY, {});
  } catch (error) {
    if (error instanceof ContentfulError) return fail(error.kind, statusToLog(error));
    throw error;
  }

  const schema = createHomeBannerCollectionResponseSchema(spaceId);
  const parsed = schema.safeParse(data);
  if (!parsed.success) return fail("validation");

  const [banner] = parsed.data.homeBannerCollection.items;
  if (!banner) return fail("not-found");

  return { ok: true, banner };
}
