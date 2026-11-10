interface WithId {
  readonly id: string;
}

/**
 * The poems that are in no collection, in the order given (newest first from `listAuthorPoems`). A collected id with
 * no matching poem is ignored (show-only-free-poems design D3).
 */
export function selectFreePoems<P extends WithId>(poems: readonly P[], collected: readonly WithId[]): readonly P[] {
  const collectedIds = new Set(collected.map((poem) => poem.id));
  return poems.filter((poem) => !collectedIds.has(poem.id));
}
