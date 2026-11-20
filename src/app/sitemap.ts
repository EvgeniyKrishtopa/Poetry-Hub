import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { getSitemapEntries } from "@/features/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Never prerendered: an env-less build must not fail, and a failed read must answer 5xx at request time,
  // not freeze an empty list into the build (design D5; spike 1.3).
  await connection();
  return getSitemapEntries();
}
