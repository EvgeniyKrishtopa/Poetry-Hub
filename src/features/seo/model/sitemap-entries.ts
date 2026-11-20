import type { MetadataRoute } from "next";

import type { SitemapSource } from "./sitemap.types";

/**
 * The sitemap's entries (FR-9): the fixed pages, each public author, each poem of a listed author, and each
 * distinct non-null collection per author; absolute URLs; never a private or auth page.
 */
export function buildSitemapEntries(source: SitemapSource): MetadataRoute.Sitemap {
  void source;
  throw new Error("not implemented");
}
