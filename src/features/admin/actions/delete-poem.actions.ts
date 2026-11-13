"use server";

import { deleteTargetSchema } from "../model/admin.schema";
import type { DeleteActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";

/** Deletes another user's poem, expires the author's works tag and removes the illustration best-effort (design D8, FR-8). */
export const deletePoemAction = adminActionClient
  .inputSchema(deleteTargetSchema)
  .action(async (): Promise<DeleteActionResult> => {
    throw new Error("not implemented");
  });
