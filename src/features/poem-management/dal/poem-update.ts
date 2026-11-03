import "server-only";

import type { UpdateOwnPoemInput, UpdateOwnPoemResult } from "../model/poem-management.types";

/**
 * Uploads a replacement (if any), calls `update_my_poem` as the signed-in owner, and removes the new upload when
 * the row wasn't written; a failure is a value, never a throw (edit-poem design D2, D3).
 */
export async function updateOwnPoem(input: UpdateOwnPoemInput): Promise<UpdateOwnPoemResult> {
  void input;
  throw new Error("not implemented");
}
