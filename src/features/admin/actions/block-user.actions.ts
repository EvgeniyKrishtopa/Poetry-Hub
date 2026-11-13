"use server";

import { targetUserSchema } from "../model/admin.schema";
import type { ModerationActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";

/** Blocks a user: validate, session, then `admin_block_user`; success refreshes the list (design D3, FR-4). */
export const blockUserAction = adminActionClient
  .inputSchema(targetUserSchema)
  .action(async (): Promise<ModerationActionResult> => {
    throw new Error("not implemented");
  });
