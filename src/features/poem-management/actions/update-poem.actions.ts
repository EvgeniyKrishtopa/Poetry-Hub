"use server";

import { updatePoemInputSchema } from "../model/poem-form.schema";
import type { UpdatePoemResult } from "../model/poem-management.types";

import { poemManagementActionClient } from "./action-client";

/** Saves an edit of one of the caller's own poems (edit-poem design D3). */
export const updatePoemAction = poemManagementActionClient
  .inputSchema(updatePoemInputSchema)
  .action(async (): Promise<UpdatePoemResult> => {
    throw new Error("not implemented");
  });
