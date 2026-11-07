import "server-only";

import type { CollectedPoemsResult, CollectionPoemChoicesResult } from "../model/collection-management.types";

/**
 * The collection's own poems and the author's free ones, newest first, through the definer function
 * `my_collection_poem_choices` (add-poems-to-collections D3, ADR 0012). Callers have passed `getOwnCollection`.
 */
export async function getCollectionPoemChoices(collectionId: string): Promise<CollectionPoemChoicesResult> {
  void collectionId;
  throw new Error("not implemented");
}

/** The author's poems that are in a collection, newest first, through `my_collected_poems` (add-poems-to-collections D3). */
export async function listCollectedPoems(): Promise<CollectedPoemsResult> {
  throw new Error("not implemented");
}
