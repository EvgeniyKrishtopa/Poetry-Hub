import "server-only";

import type { HomeFeaturedIdsResult } from "../model/home-section.types";

/**
 * The chosen poem and author ids in position order, from the `home_featured_ids` function through the public
 * client in its own cache scope: `hours` on success, `seconds` on failure, tagged `HOME_FEATURED_TAG`. A failure is
 * `{ ok: false }`, logged by kind only, never thrown (FR-7, FR-12, FR-13).
 */
export async function getHomeFeaturedIds(): Promise<HomeFeaturedIdsResult> {
  throw new Error("not implemented");
}
