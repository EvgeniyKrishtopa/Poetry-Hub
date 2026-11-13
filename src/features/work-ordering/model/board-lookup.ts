import type { Arrangement, BoardPoem, PoemContainer } from "./work-ordering.types";

/** Where a poem stands on the board: its list, its place in it, and what a screen reader says about the list. */
export interface PoemSpot {
  readonly poem: BoardPoem;
  readonly container: PoemContainer;
  readonly collectionTitle: string | null;
  /** Zero-based index in the list. */
  readonly index: number;
  readonly total: number;
}

/** The poem's spot, or `undefined` when no list holds it (a stale event). */
export function findPoem(arrangement: Arrangement, poemId: string): PoemSpot | undefined {
  for (const collection of arrangement.collections) {
    const index = collection.poems.findIndex((poem) => poem.id === poemId);
    const poem = collection.poems[index];
    if (poem !== undefined) {
      return {
        poem,
        container: { kind: "collection", collectionId: collection.id },
        collectionTitle: collection.title,
        index,
        total: collection.poems.length,
      };
    }
  }

  const index = arrangement.freePoems.findIndex((poem) => poem.id === poemId);
  const poem = arrangement.freePoems[index];
  if (poem === undefined) return undefined;
  return { poem, container: { kind: "free" }, collectionTitle: null, index, total: arrangement.freePoems.length };
}
