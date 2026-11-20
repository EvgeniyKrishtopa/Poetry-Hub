import type { MetadataRoute } from "next";

import { ACCOUNT_PATH } from "@/shared/config/account-paths";
import { API_PATH, AUTH_PATH } from "@/shared/lib/seo";

/** Where `app/sitemap.ts` is served; the `Sitemap:` line names it with an absolute URL. */
const SITEMAP_PATH = "/sitemap.xml";

/**
 * The private areas a crawler is told not to fetch. `/admin` is left out on purpose: `robots.txt` is public, so
 * naming it would announce a page that answers a non-admin with the not-found screen (FR-8).
 */
const DISALLOWED_PATHS = [ACCOUNT_PATH, AUTH_PATH, API_PATH];

/** The `robots.txt` rules (FR-8): allow `/`, disallow `/account`, `/auth` and `/api` (never `/admin`), name the sitemap. */
export function buildRobots(siteUrl: string): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS },
    sitemap: `${siteUrl}${SITEMAP_PATH}`,
  };
}
