import "server-only";

import type { CollectionEditAllowance } from "../model/collection-management.types";

import { consumeWriteAllowance } from "./write-allowance";

/** The limit's scope in `write_rate_limits` (design D2) and its names in the log. */
const COLLECTION_EDIT_LIMIT = { scope: "collection_edit", operation: "check edit limit", name: "edit limit" } as const;

/** Counts one save attempt against the caller's `collection_edit` limit, 10 per minute per account; never throws (design D2, D6). */
export async function consumeCollectionEditAllowance(): Promise<CollectionEditAllowance> {
  return consumeWriteAllowance(COLLECTION_EDIT_LIMIT);
}
