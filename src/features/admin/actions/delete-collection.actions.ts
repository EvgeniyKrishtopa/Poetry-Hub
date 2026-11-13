"use server";

import { deleteTargetSchema } from "../model/admin.schema";
import type { DeleteActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";

/** Deletes another user's collection and expires the author's works tag (FR-9). */
export const deleteCollectionAction = adminActionClient
  .inputSchema(deleteTargetSchema)
  .action(async (): Promise<DeleteActionResult> => {
    throw new Error("not implemented");
  });
