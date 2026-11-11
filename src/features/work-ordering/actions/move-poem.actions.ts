"use server";

import { movePoemInputSchema } from "../model/move.schema";
import type { MoveResult } from "../model/work-ordering.types";

import { workOrderingActionClient } from "./action-client";

/**
 * Moves one of the author's poems to a place in a collection or the free poems: ids guard, session, limit, move; on
 * `moved` expire the public tag and refresh, on `stale` and `not-found` only refresh (design D6, FR-6, FR-11).
 */
export const movePoemAction = workOrderingActionClient
  .inputSchema(movePoemInputSchema)
  .action(async ({ parsedInput }): Promise<MoveResult> => {
    void parsedInput;
    throw new Error("not implemented");
  });
