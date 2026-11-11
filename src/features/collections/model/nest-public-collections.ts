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
  const poemsByCollection = Map.groupBy(poems, (poem) => poem.collectionId);
  return collections.flatMap((collection) => {
    const collectionPoems = poemsByCollection.get(collection.id);
    if (collectionPoems === undefined) return [];
    return [{ ...collection, poems: collectionPoems.map(({ id, title }) => ({ id, title })) }];
  });
}

/** Whether any poem is in a collection: on a failed collections read, the section shows its unavailable text (D6). */
export function hasCollectedPoems(poems: readonly Poem[]): boolean {
  return poems.some((poem) => poem.collectionId !== null);
}
