"use server";

import { HOME_ENTRY_OPERATION } from "../model/home-entry.constants";
import { addHomePoemSchema } from "../model/home-entry.schema";
import type { HomeActionResult, HomeAddStatus } from "../model/home-entry.types";

import { adminActionClient } from "./action-client";
import { runHomeWrite } from "./run-home-write";

/**
 * Chooses a poem for the home page: validate the id, check the session, call `admin_add_home_poem`, and expire
 * `HOME_FEATURED_TAG` and `refresh()` only on `added` (FR-8, FR-13).
 */
export const addHomePoemAction = adminActionClient
  .inputSchema(addHomePoemSchema)
  .action(async ({ parsedInput }): Promise<HomeActionResult<HomeAddStatus>> => {
    return runHomeWrite({ operation: HOME_ENTRY_OPERATION.addPoem, input: parsedInput });
  });
