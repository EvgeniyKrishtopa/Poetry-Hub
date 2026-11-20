import type { MetadataRoute } from "next";

/** The `robots.txt` rules (FR-8): allow `/`, disallow `/account`, `/auth` and `/api` (never `/admin`), name the sitemap. */
export function buildRobots(siteUrl: string): MetadataRoute.Robots {
  void siteUrl;
  throw new Error("not implemented");
}
