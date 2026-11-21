"use server";

import type { HomeActionResult, HomeAddStatus } from "../model/home-entry.types";
import { addHomeAuthorSchema } from "../model/home-entry.schema";

import { adminActionClient } from "./action-client";

/**
 * Chooses an author for the home page by profile id: validate the id, check the session, call
 * `admin_add_home_author`, and expire `HOME_FEATURED_TAG` and `refresh()` only on `added` (FR-8, FR-13).
 */
export const addHomeAuthorAction = adminActionClient
  .inputSchema(addHomeAuthorSchema)
  .action(async ({ parsedInput }): Promise<HomeActionResult<HomeAddStatus>> => {
    void parsedInput;
    throw new Error("not implemented");
  });
