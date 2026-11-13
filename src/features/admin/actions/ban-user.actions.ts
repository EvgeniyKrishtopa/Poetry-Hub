"use server";

import { targetUserSchema } from "../model/admin.schema";
import type { ModerationActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";

/** Bans a user and their email (FR-5). */
export const banUserAction = adminActionClient
  .inputSchema(targetUserSchema)
  .action(async (): Promise<ModerationActionResult> => {
    throw new Error("not implemented");
  });
