import "server-only";

import type { PublicPoemRefsResult } from "../model/public-poem-refs.types";

/**
 * Every public poem's id, author id and collection id for the sitemap, read in pages until one is empty
 * (Supabase caps a response at 1000 rows), through the public client in one `"use cache"` scope: `hours`
 * on success, `seconds` on failure, no tag (seo-metadata design D5). Any page error fails the whole read.
 */
export async function listPublicPoemRefs(): Promise<PublicPoemRefsResult> {
  throw new Error("not implemented");
}
