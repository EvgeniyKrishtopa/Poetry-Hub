import "server-only";

import type { CollectionPoemsSaveAllowance } from "../model/collection-management.types";

import { consumeWriteAllowance } from "./write-allowance";

/** The limit's scope in `write_rate_limits` (add-poems-to-collections D2) and its names in the log. */
const COLLECTION_POEMS_SAVE_LIMIT = {
  scope: "collection_poems_save",
  operation: "check collection poems save limit",
  name: "collection poems save limit",
} as const;

/** Counts one save attempt against the caller's `collection_poems_save` limit, 10 per minute per account; never throws (add-poems-to-collections D2, D6). */
export async function consumeCollectionPoemsSaveAllowance(): Promise<CollectionPoemsSaveAllowance> {
  return consumeWriteAllowance(COLLECTION_POEMS_SAVE_LIMIT);
}
