import type { Poem } from "./poem.types";

/** The poems in no collection, order kept: the author page's free poems (public-collections D3). */
export function uncollectedPoems(poems: readonly Poem[]): readonly Poem[] {
  return poems.filter((poem) => poem.collectionId === null);
}
