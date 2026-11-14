"use server";

import { blockUser } from "../dal/moderation-rpc";
import { targetUserSchema } from "../model/admin.schema";
import type { ModerationActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";
import { runModeration } from "./run-moderation";

/** Blocks a user: validate, session, then `admin_block_user`; success refreshes the list (design D3, FR-4). */
export const blockUserAction = adminActionClient
  .inputSchema(targetUserSchema)
  .action(async ({ parsedInput }): Promise<ModerationActionResult> => runModeration(blockUser, parsedInput));
