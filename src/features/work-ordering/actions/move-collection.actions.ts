"use server";

import { moveCollectionInputSchema } from "../model/move.schema";
import type { MoveResult } from "../model/work-ordering.types";

import { workOrderingActionClient } from "./action-client";

/** Moves one of the author's collections to a place among them; the same steps as `movePoemAction` (design D6, FR-5). */
export const moveCollectionAction = workOrderingActionClient
  .inputSchema(moveCollectionInputSchema)
  .action(async ({ parsedInput }): Promise<MoveResult> => {
    void parsedInput;
    throw new Error("not implemented");
  });
