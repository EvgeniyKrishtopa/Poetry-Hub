"use server";

import { revokeSessions } from "../dal/moderation-rpc";
import { targetUserSchema } from "../model/admin.schema";
import type { ModerationActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";
import { runModeration } from "./run-moderation";

/** Ends all of a user's sessions without changing the account state (FR-6). */
export const revokeSessionsAction = adminActionClient
  .inputSchema(targetUserSchema)
  .action(async ({ parsedInput }): Promise<ModerationActionResult> => runModeration(revokeSessions, parsedInput));
