import "server-only";

import type { CollectionEditAllowance } from "../model/collection-management.types";

/** One `collection_edit` attempt through `consume_write_allowance`: 10 per minute per account (design D2, D6). */
export async function consumeCollectionEditAllowance(): Promise<CollectionEditAllowance> {
  throw new Error("not implemented");
}
