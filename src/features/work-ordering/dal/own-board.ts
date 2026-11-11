import "server-only";

import type { OwnBoardResult } from "../model/work-ordering.types";

/**
 * The author's collections and poems in parallel, each filtered by the author's own id and ordered by
 * `position, id`, then nested; either read failing says which (design D4). Each read logs its own failure.
 */
export async function listOwnBoard(authorId: string): Promise<OwnBoardResult> {
  void authorId;
  throw new Error("not implemented");
}
