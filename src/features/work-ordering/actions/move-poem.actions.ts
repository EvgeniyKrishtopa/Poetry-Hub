"use server";

import { moveOwnPoem } from "../dal/move-writes";
import { areMoveIdsValid, movePoemInputSchema } from "../model/move.schema";
import type { MoveResult } from "../model/work-ordering.types";

import { workOrderingActionClient } from "./action-client";
import { runMove } from "./run-move";

/**
 * Moves one of the author's poems to a place in a collection or the free poems: ids guard, session, limit, move; on
 * `moved` expire the public tag and refresh, on `stale` and `not-found` only refresh (design D6, FR-6, FR-11).
 */
export const movePoemAction = workOrderingActionClient
  .inputSchema(movePoemInputSchema)
  .action(
    async ({ parsedInput }): Promise<MoveResult> => runMove(areMoveIdsValid(parsedInput), () => moveOwnPoem(parsedInput)),
  );
