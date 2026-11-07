import type { CollectionPoemChoice, SelectionDiff } from "./collection-management.types";

/** The ids of the poems stored in the collection (add-poems-to-collections D5). */
export function storedSelection(choices: readonly CollectionPoemChoice[]): ReadonlySet<string> {
  void choices;
  throw new Error("not implemented");
}

/** Whether the checked set differs from the stored one, order ignored (add-poems-to-collections FR-5). */
export function isSelectionChanged(stored: ReadonlySet<string>, draft: ReadonlySet<string>): boolean {
  void stored;
  void draft;
  throw new Error("not implemented");
}

/** What a save sends; ids not among `choices` are left out (add-poems-to-collections D5). */
export function selectionDiff(
  choices: readonly CollectionPoemChoice[],
  stored: ReadonlySet<string>,
  draft: ReadonlySet<string>,
): SelectionDiff {
  void choices;
  void stored;
  void draft;
  throw new Error("not implemented");
}
