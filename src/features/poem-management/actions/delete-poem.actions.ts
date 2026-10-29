"use server";

import { deletePoemInputSchema } from "../model/delete-poem.schema";
import type { DeletePoemResult } from "../model/poem-management.types";

import { poemManagementActionClient } from "./action-client";

/** Deletes one of the caller's own poems by id (design D3). */
export const deletePoemAction = poemManagementActionClient
  .inputSchema(deletePoemInputSchema)
  .action(async (): Promise<DeletePoemResult> => {
    throw new Error("not implemented");
  });
