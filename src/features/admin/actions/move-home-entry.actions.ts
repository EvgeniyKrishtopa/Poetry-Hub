"use server";

import type { HomeActionResult, HomeMoveStatus } from "../model/home-entry.types";
import { moveHomeEntrySchema } from "../model/home-entry.schema";

import { adminActionClient } from "./action-client";

/**
 * Moves an entry to a new place in its list: validate, check the session, call `admin_move_home_entry`; `moved`
 * expires `HOME_FEATURED_TAG` and refreshes, `stale` and `not-found` only refresh so the real list shows (FR-9, FR-13).
 */
export const moveHomeEntryAction = adminActionClient
  .inputSchema(moveHomeEntrySchema)
  .action(async ({ parsedInput }): Promise<HomeActionResult<HomeMoveStatus>> => {
    void parsedInput;
    throw new Error("not implemented");
  });
