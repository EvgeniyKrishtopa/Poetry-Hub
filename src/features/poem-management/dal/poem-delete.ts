import "server-only";

import type { DeleteOwnPoemResult } from "../model/poem-management.types";

/** `delete_my_poem(poemId)` as the signed-in owner; a failure is a value, never a throw (design D2, D3). */
export async function deleteOwnPoem(poemId: string): Promise<DeleteOwnPoemResult> {
  void poemId;
  throw new Error("not implemented");
}
