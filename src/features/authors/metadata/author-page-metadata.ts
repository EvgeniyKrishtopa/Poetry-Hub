import "server-only";

import type { Metadata } from "next";

/**
 * A public author page's metadata: the full name as title, «О себе» (or a fixed sentence naming the author)
 * as description, the photo or the default share image (FR-1 to FR-5, FR-10).
 */
export async function getAuthorPageMetadata(id: string): Promise<Metadata> {
  void id;
  throw new Error("not implemented");
}
