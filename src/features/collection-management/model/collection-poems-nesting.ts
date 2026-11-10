import type { CollectedPoem, CollectionSummary, CollectionWithPoems } from "./collection-management.types";

/**
 * Puts each poem under its collection, keeping both lists' order (add-poems-to-collections D10). A collection with no
 * poems gets an empty list; a poem whose collection isn't listed is left out.
 */
export function nestCollectedPoems(
  collections: readonly CollectionSummary[],
  poems: readonly CollectedPoem[],
): CollectionWithPoems[] {
  const poemsByCollection = Map.groupBy(poems, (poem) => poem.collectionId);
  return collections.map((collection) => ({ ...collection, poems: poemsByCollection.get(collection.id) ?? [] }));
}
