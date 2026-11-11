import type { Arrangement } from "./work-ordering.types";

/** One collection row as the board reads it, in the stored order. */
export interface BoardCollectionRow {
  readonly id: string;
  readonly title: string;
}

/** One poem row as the board reads it, in the stored order. */
export interface BoardPoemRow {
  readonly id: string;
  readonly title: string;
  readonly collectionId: string | null;
}

/**
 * Puts each poem under its collection and the rest among the free poems, keeping the order given. A collection
 * with no poem gets an empty list; a poem whose collection is not listed is left out (design D3, D4). The feature's
 * own copy of the nesting its siblings do: the features do not import each other.
 */
export function nestBoard(collections: readonly BoardCollectionRow[], poems: readonly BoardPoemRow[]): Arrangement {
  void collections;
  void poems;
  throw new Error("not implemented");
}
