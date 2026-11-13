import "server-only";

import type { TargetUserInput } from "../model/admin.schema";
import type { ModerationWriteResult } from "../model/admin.types";

/** Calls `admin_block_user`; the caller's admin right is checked inside the database (design D2). */
export async function blockUser(input: TargetUserInput): Promise<ModerationWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_unblock_user`. */
export async function unblockUser(input: TargetUserInput): Promise<ModerationWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_ban_user`. */
export async function banUser(input: TargetUserInput): Promise<ModerationWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_revoke_sessions`. */
export async function revokeSessions(input: TargetUserInput): Promise<ModerationWriteResult> {
  void input;
  throw new Error("not implemented");
}
