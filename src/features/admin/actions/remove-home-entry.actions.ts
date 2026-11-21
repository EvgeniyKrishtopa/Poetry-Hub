"use server";

import type { HomeActionResult, HomeRemoveStatus } from "../model/home-entry.types";
import { removeHomeEntrySchema } from "../model/home-entry.schema";

import { adminActionClient } from "./action-client";

/**
 * Removes an entry from its list: validate, check the session, call `admin_remove_home_entry`; `removed` expires
 * `HOME_FEATURED_TAG` and refreshes, `not-found` only refreshes (FR-9, FR-13).
 */
export const removeHomeEntryAction = adminActionClient
  .inputSchema(removeHomeEntrySchema)
  .action(async ({ parsedInput }): Promise<HomeActionResult<HomeRemoveStatus>> => {
    void parsedInput;
    throw new Error("not implemented");
  });
