import type { CollectionPoemChoice } from "../../model/collection-management.types";

export interface CollectionPoemsFormProps {
  readonly collectionId: string;
  /** The collection's poems (selected) and the free ones, newest first; empty shows the nothing-to-manage text. */
  readonly choices: readonly CollectionPoemChoice[];
}
