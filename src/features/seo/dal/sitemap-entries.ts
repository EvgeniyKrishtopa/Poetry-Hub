import "server-only";

import type { MetadataRoute } from "next";

import { listPublicAuthors } from "@/features/authors";
import { listPublicPoemRefs } from "@/features/poems";
import { getSiteUrl } from "@/shared/lib/seo";

import { buildSitemapEntries } from "../model/sitemap-entries";

/**
 * Reads the public authors and the public poem references, then builds the entries. Throws when either read
 * is unavailable, so the route answers 5xx instead of a partial sitemap (FR-9).
 */
export async function getSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const [authors, poems] = await Promise.all([listPublicAuthors(), listPublicPoemRefs()]);
  if (!authors.ok) throw new Error("Sitemap source unavailable: public authors");
  if (!poems.ok) throw new Error("Sitemap source unavailable: public poem refs");

  return buildSitemapEntries({
    siteUrl: getSiteUrl(),
    authorIds: authors.authors.map((author) => author.id),
    poemRefs: poems.refs,
  });
}
