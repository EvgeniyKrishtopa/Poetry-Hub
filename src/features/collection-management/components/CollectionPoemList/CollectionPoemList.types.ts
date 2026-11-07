import type { CollectionPoemChoice } from "../../model/collection-management.types";

export interface CollectionPoemListProps {
  /** The collection's own poems, newest first; empty renders nothing. */
  readonly poems: readonly CollectionPoemChoice[];
}
