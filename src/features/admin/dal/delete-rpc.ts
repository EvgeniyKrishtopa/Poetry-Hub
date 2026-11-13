import "server-only";

import type { DeleteTargetInput } from "../model/admin.schema";
import type { CollectionDeleteWriteResult, PoemDeleteWriteResult } from "../model/admin.types";

/** Calls `admin_delete_poem`; the admin right is checked inside the database (design D2, D7). */
export async function deletePoemAsAdmin(input: DeleteTargetInput): Promise<PoemDeleteWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_delete_collection`. */
export async function deleteCollectionAsAdmin(input: DeleteTargetInput): Promise<CollectionDeleteWriteResult> {
  void input;
  throw new Error("not implemented");
}
