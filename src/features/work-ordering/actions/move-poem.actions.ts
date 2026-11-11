"use server";

import type { MovePoemInput } from "../model/move.schema";
import type { MoveResult } from "../model/work-ordering.types";

/**
 * Moves one of the author's poems to a place in a collection or the free poems: validate, session, limit, move; on
 * `moved` expire the public tag and refresh, on `stale` and `not-found` only refresh (design D6, FR-6, FR-11).
 */
export async function movePoemAction(input: MovePoemInput): Promise<MoveResult> {
  void input;
  throw new Error("not implemented");
}
