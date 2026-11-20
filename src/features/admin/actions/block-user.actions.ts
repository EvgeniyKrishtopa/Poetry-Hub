"use server";

import { blockUser } from "../dal/moderation-rpc";
import { targetUserSchema } from "../model/admin.schema";
import type { ModerationActionResult } from "../model/admin.types";
import { ACTION_NOTICE_KIND } from "../model/violation.constants";

import { adminActionClient } from "./action-client";
import { runRestriction } from "./run-restriction";

/** Blocks a user: validate, session, `admin_block_user`, then the standard email (design D3, D5, FR-4, FR-9). */
export const blockUserAction = adminActionClient
  .inputSchema(targetUserSchema)
  .action(
    async ({ parsedInput }): Promise<ModerationActionResult> =>
      runRestriction(blockUser, ACTION_NOTICE_KIND.block, parsedInput),
  );
