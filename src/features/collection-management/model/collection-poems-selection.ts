import type { CollectionPoemChoice, SelectionDiff } from "./collection-management.types";

/** The ids of the poems stored in the collection (add-poems-to-collections D5). */
export function storedSelection(choices: readonly CollectionPoemChoice[]): ReadonlySet<string> {
  return new Set(choices.filter((choice) => choice.selected).map((choice) => choice.id));
}

/** Whether the checked set differs from the stored one, order ignored (add-poems-to-collections FR-5). */
export function isSelectionChanged(stored: ReadonlySet<string>, draft: ReadonlySet<string>): boolean {
  return stored.size !== draft.size || [...draft].some((id) => !stored.has(id));
}

/** What a save sends, in `choices` order; ids not among `choices` are left out (add-poems-to-collections D5). */
export function selectionDiff(
  choices: readonly CollectionPoemChoice[],
  stored: ReadonlySet<string>,
  draft: ReadonlySet<string>,
): SelectionDiff {
  const ids = choices.map((choice) => choice.id);
  return {
    added: ids.filter((id) => draft.has(id) && !stored.has(id)),
    removed: ids.filter((id) => stored.has(id) && !draft.has(id)),
  };
}
