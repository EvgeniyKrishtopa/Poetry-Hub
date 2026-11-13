"use server";

import { targetUserSchema } from "../model/admin.schema";
import type { ModerationActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";

/** Unblocks a blocked user (FR-4). */
export const unblockUserAction = adminActionClient
  .inputSchema(targetUserSchema)
  .action(async (): Promise<ModerationActionResult> => {
    throw new Error("not implemented");
  });
