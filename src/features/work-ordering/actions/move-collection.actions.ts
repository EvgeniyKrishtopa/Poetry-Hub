"use server";

import type { MoveCollectionInput } from "../model/move.schema";
import type { MoveResult } from "../model/work-ordering.types";

/** Moves one of the author's collections to a place among them; the same steps as `movePoemAction` (design D6, FR-5). */
export async function moveCollectionAction(input: MoveCollectionInput): Promise<MoveResult> {
  void input;
  throw new Error("not implemented");
}
