import "server-only";

import type {
  SaveOwnCollectionPoemsInput,
  SaveOwnCollectionPoemsResult,
} from "../model/collection-management.types";

/** Calls `save_my_collection_poems()`: the whole change or nothing; never throws (add-poems-to-collections D2, D6). */
export async function saveOwnCollectionPoems(input: SaveOwnCollectionPoemsInput): Promise<SaveOwnCollectionPoemsResult> {
  void input;
  throw new Error("not implemented");
}
