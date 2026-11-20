import "server-only";

import type { MetadataRoute } from "next";

/**
 * Reads the public authors and the public poem references, then builds the entries. Throws when either read
 * is unavailable, so the route answers 5xx instead of a partial sitemap (FR-9).
 */
export async function getSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  throw new Error("not implemented");
}
