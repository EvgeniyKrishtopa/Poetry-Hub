"use server";

import { HOME_ENTRY_OPERATION } from "../model/home-entry.constants";
import { moveHomeEntrySchema } from "../model/home-entry.schema";
import type { HomeActionResult, HomeMoveStatus } from "../model/home-entry.types";

import { adminActionClient } from "./action-client";
import { runHomeWrite } from "./run-home-write";

/**
 * Moves an entry to a new place in its list: validate, check the session, call `admin_move_home_entry`; `moved`
 * expires `HOME_FEATURED_TAG` and refreshes, `stale` and `not-found` only refresh so the real list shows (FR-9, FR-13).
 */
export const moveHomeEntryAction = adminActionClient
  .inputSchema(moveHomeEntrySchema)
  .action(async ({ parsedInput }): Promise<HomeActionResult<HomeMoveStatus>> => {
    return runHomeWrite({ operation: HOME_ENTRY_OPERATION.move, input: parsedInput });
  });
