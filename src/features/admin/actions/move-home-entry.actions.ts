"use server";

import { moveHomeEntry } from "../dal/home-rpc";
import { moveHomeEntrySchema } from "../model/home-entry.schema";
import type { HomeActionResult, HomeMoveStatus } from "../model/home-entry.types";

import { adminActionClient } from "./action-client";
import { HOME_MOVE_EFFECTS, runHomeWrite } from "./run-home-write";

/**
 * Moves an entry to a new place in its list: validate, check the session, call `admin_move_home_entry`; `moved`
 * expires `HOME_FEATURED_TAG` and refreshes, `stale` and `not-found` only refresh so the real list shows (FR-9, FR-13).
 */
export const moveHomeEntryAction = adminActionClient
  .inputSchema(moveHomeEntrySchema)
  .action(async ({ parsedInput }): Promise<HomeActionResult<HomeMoveStatus>> => {
    return runHomeWrite(() => moveHomeEntry(parsedInput), HOME_MOVE_EFFECTS);
  });
