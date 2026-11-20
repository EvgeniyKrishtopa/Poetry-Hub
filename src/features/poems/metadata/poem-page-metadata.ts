import "server-only";

import type { Metadata } from "next";

/**
 * The poem page's metadata, from the page's own memoized reads (NFR-1): a `not-found` result is
 * `notFound()`, `unavailable` throws as the page body does, and an exception in this module's own code
 * returns the fallback (FR-1 to FR-5, FR-10).
 */
export async function getPoemPageMetadata(authorId: string, poemId: string): Promise<Metadata> {
  void authorId;
  void poemId;
  throw new Error("not implemented");
}
