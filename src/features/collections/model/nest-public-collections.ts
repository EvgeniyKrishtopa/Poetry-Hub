import type { Poem } from "@/features/poems";

import type { PublicCollection, PublicCollectionEntry } from "./public-collections.types";

/**
 * Each collection with the poems whose `collectionId` matches, in the poems list's order (newest first); a
 * collection left with no poems is dropped (public-collections D5).
 */
export function nestPublicCollections(
  collections: readonly PublicCollectionEntry[],
  poems: readonly Poem[],
): readonly PublicCollection[] {
  void collections;
  void poems;
  throw new Error("not implemented");
}

/** Whether any poem is in a collection: on a failed collections read, the section shows its unavailable text (D6). */
export function hasCollectedPoems(poems: readonly Poem[]): boolean {
  void poems;
  throw new Error("not implemented");
}
