"use server";

import { moveOwnCollection } from "../dal/move-writes";
import { areMoveIdsValid, moveCollectionInputSchema } from "../model/move.schema";
import type { MoveResult } from "../model/work-ordering.types";

import { workOrderingActionClient } from "./action-client";
import { runMove } from "./run-move";

/** Moves one of the author's collections to a place among them; the same steps as `movePoemAction` (design D6, FR-5). */
export const moveCollectionAction = workOrderingActionClient
  .inputSchema(moveCollectionInputSchema)
  .action(
    async ({ parsedInput }): Promise<MoveResult> =>
      runMove(areMoveIdsValid(parsedInput), () => moveOwnCollection(parsedInput)),
  );
