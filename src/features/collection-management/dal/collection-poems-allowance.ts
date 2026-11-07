import "server-only";

import type { CollectionPoemsSaveAllowance } from "../model/collection-management.types";

/** Counts one save attempt against the caller's `collection_poems_save` limit; never throws (add-poems-to-collections D2, D6). */
export async function consumeCollectionPoemsSaveAllowance(): Promise<CollectionPoemsSaveAllowance> {
  throw new Error("not implemented");
}
