"use server";

import { unblockUser } from "../dal/moderation-rpc";
import { targetUserSchema } from "../model/admin.schema";
import type { ModerationActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";
import { runModeration } from "./run-moderation";

/** Unblocks a blocked user (FR-4). */
export const unblockUserAction = adminActionClient
  .inputSchema(targetUserSchema)
  .action(async ({ parsedInput }): Promise<ModerationActionResult> => runModeration(unblockUser, parsedInput));
