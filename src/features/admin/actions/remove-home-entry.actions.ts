"use server";

import { HOME_ENTRY_OPERATION } from "../model/home-entry.constants";
import { removeHomeEntrySchema } from "../model/home-entry.schema";
import type { HomeActionResult, HomeRemoveStatus } from "../model/home-entry.types";

import { adminActionClient } from "./action-client";
import { runHomeWrite } from "./run-home-write";

/**
 * Removes an entry from its list: validate, check the session, call `admin_remove_home_entry`; `removed` expires
 * `HOME_FEATURED_TAG` and refreshes, `not-found` only refreshes (FR-9, FR-13).
 */
export const removeHomeEntryAction = adminActionClient
  .inputSchema(removeHomeEntrySchema)
  .action(async ({ parsedInput }): Promise<HomeActionResult<HomeRemoveStatus>> => {
    return runHomeWrite({ operation: HOME_ENTRY_OPERATION.remove, input: parsedInput });
  });
