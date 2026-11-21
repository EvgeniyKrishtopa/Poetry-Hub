"use server";

import { addHomeAuthor } from "../dal/home-rpc";
import { addHomeAuthorSchema } from "../model/home-entry.schema";
import type { HomeActionResult, HomeAddStatus } from "../model/home-entry.types";

import { adminActionClient } from "./action-client";
import { HOME_ADD_EFFECTS, runHomeWrite } from "./run-home-write";

/**
 * Chooses an author for the home page by profile id: validate the id, check the session, call
 * `admin_add_home_author`, and expire `HOME_FEATURED_TAG` and `refresh()` only on `added` (FR-8, FR-13).
 */
export const addHomeAuthorAction = adminActionClient
  .inputSchema(addHomeAuthorSchema)
  .action(async ({ parsedInput }): Promise<HomeActionResult<HomeAddStatus>> => {
    return runHomeWrite(() => addHomeAuthor(parsedInput), HOME_ADD_EFFECTS);
  });
