import "server-only";

import type { Metadata } from "next";

import type { ContentPageKey } from "../model/content-page.types";

/**
 * A content page's metadata: the entry's title and the page's own fixed description; a missing entry is
 * `notFound()`, any other failed read throws as the page body does (FR-1, FR-2, FR-10).
 */
export async function getContentPageMetadata(entryKey: ContentPageKey): Promise<Metadata> {
  void entryKey;
  throw new Error("not implemented");
}
