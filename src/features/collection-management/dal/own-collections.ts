import "server-only";

import { cache } from "react";

import type {
  OwnCollectionResult,
  OwnCollectionsResult,
  OwnCollectionTitleResult,
} from "../model/collection-management.types";

/** The author's collections for the `/account/poems` section, newest first, through RLS (design D4). */
export async function listOwnCollections(authorId: string): Promise<OwnCollectionsResult> {
  void authorId;
  throw new Error("not implemented");
}

/**
 * One own collection, memoized per request so the page and its trail share one read (design D4, ADR 0008):
 * malformed id, another author's, or a non-public own profile → `not-found`; a failed read → `unavailable`.
 */
export const getOwnCollection = cache(async (collectionId: string): Promise<OwnCollectionResult> => {
  void collectionId;
  throw new Error("not implemented");
});

/** The trail's title item, derived from `getOwnCollection` (design D11). */
export async function getOwnCollectionTitle(collectionId: string): Promise<OwnCollectionTitleResult> {
  void collectionId;
  throw new Error("not implemented");
}
