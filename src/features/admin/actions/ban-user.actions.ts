"use server";

import { banUser } from "../dal/moderation-rpc";
import { targetUserSchema } from "../model/admin.schema";
import type { ModerationActionResult } from "../model/admin.types";
import { ACTION_NOTICE_KIND } from "../model/violation.constants";

import { adminActionClient } from "./action-client";
import { runRestriction } from "./run-restriction";

/** Bans a user and their email, then sends the standard email (FR-5, FR-9). */
export const banUserAction = adminActionClient
  .inputSchema(targetUserSchema)
  .action(
    async ({ parsedInput }): Promise<ModerationActionResult> =>
      runRestriction(banUser, ACTION_NOTICE_KIND.ban, parsedInput),
  );
