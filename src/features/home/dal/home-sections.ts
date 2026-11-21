import "server-only";

import type { FeaturedAuthor, FeaturedWork, LatestWork, SectionResult } from "../model/home-section.types";

// The three sections share one source of author names, the public author list: when it fails, all three
// results are `{ ok: false }` together (FR-7). A failure in only one poem read leaves the other sections alone.

/** The featured-poem cards: the chosen ids, their poems and the author names, in the admin's order (FR-2). */
export async function getFeaturedWorks(): Promise<SectionResult<FeaturedWork>> {
  throw new Error("not implemented");
}

/** The project-author cards: the chosen ids resolved against the public author list, in the admin's order (FR-4). */
export async function getFeaturedAuthors(): Promise<SectionResult<FeaturedAuthor>> {
  throw new Error("not implemented");
}

/** The newest poems with their author names, newest first (FR-5). */
export async function getLatestWorks(): Promise<SectionResult<LatestWork>> {
  throw new Error("not implemented");
}
