"use server";

import { targetUserSchema } from "../model/admin.schema";
import type { ModerationActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";

/** Ends all of a user's sessions without changing the account state (FR-6). */
export const revokeSessionsAction = adminActionClient
  .inputSchema(targetUserSchema)
  .action(async (): Promise<ModerationActionResult> => {
    throw new Error("not implemented");
  });
