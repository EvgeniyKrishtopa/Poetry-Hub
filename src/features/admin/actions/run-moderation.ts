import "server-only";

import { toModerationActionResult } from "../model/action-results";
import type { TargetUserInput } from "../model/admin.schema";
import type { ModerationActionResult, ModerationWriteResult } from "../model/admin.types";

import { checkSession } from "./session-check";

/**
 * The steps the four moderation actions share, in order, each failure stopping the rest (design flow "Block"): the
 * input is already validated by the action's schema, then the session is read again, then the one function runs. The
 * admin right is the database's to check, so nothing here decides it (design D2).
 */
export async function runModeration(
  call: (input: TargetUserInput) => Promise<ModerationWriteResult>,
  input: TargetUserInput,
): Promise<ModerationActionResult> {
  const session = await checkSession();
  if (!session.ok) return { ok: false, reason: session.failure };

  return toModerationActionResult(await call(input));
}
