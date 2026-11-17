"use server";

import { banUser } from "../dal/moderation-rpc";
import { targetUserSchema } from "../model/admin.schema";
import type { ModerationActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";
import { runModeration } from "./run-moderation";

/** Bans a user and their email (FR-5). */
export const banUserAction = adminActionClient
  .inputSchema(targetUserSchema)
  .action(async ({ parsedInput }): Promise<ModerationActionResult> => runModeration(banUser, parsedInput));
