import "server-only";

import type { Metadata } from "next";

/**
 * A public collection page's metadata: title `<collection> — <author>`, the collection's description or a
 * fixed sentence naming both; an empty, missing or another author's collection is `notFound()` (FR-1 to FR-5, FR-10).
 */
export async function getPublicCollectionPageMetadata(authorId: string, collectionId: string): Promise<Metadata> {
  void authorId;
  void collectionId;
  throw new Error("not implemented");
}
