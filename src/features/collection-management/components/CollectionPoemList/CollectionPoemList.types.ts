import type { CollectedPoem } from "../../model/collection-management.types";

export interface CollectionPoemListProps {
  /** The collection's own poems in the author's order; empty renders nothing. */
  readonly poems: readonly Pick<CollectedPoem, "id" | "title">[];
}
