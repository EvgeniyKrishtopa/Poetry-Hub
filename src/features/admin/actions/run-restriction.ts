import "server-only";

import { toModerationActionResult } from "../model/action-results";
import type { TargetUserInput } from "../model/admin.schema";
import type { ModerationActionResult, ModerationWriteResult } from "../model/admin.types";
import type { ACTION_NOTICE_KIND } from "../model/violation.constants";

import { checkSession } from "./session-check";
import { sendActionNotice } from "./send-action-notice";

/**
 * The steps of block and ban, in order, each failure stopping the rest: the input is already validated, the session is
 * read again, the one function runs, and only after it committed the affected user gets the standard email. The email
 * is called here with its kind, never from `runModeration`, so unblock and revoke can't start sending one (design D5).
 */
export async function runRestriction(
  call: (input: TargetUserInput) => Promise<ModerationWriteResult>,
  kind: typeof ACTION_NOTICE_KIND.block | typeof ACTION_NOTICE_KIND.ban,
  input: TargetUserInput,
): Promise<ModerationActionResult> {
  const session = await checkSession();
  if (!session.ok) return { ok: false, reason: session.failure };

  const write = await call(input);
  if (!write.ok) return toModerationActionResult(write);

  // Only a restriction that happened carries the email's source, so its presence is the test.
  if ("noticeEmail" in write) {
    const notice = await sendActionNotice({
      kind,
      userId: input.userId,
      email: write.noticeEmail,
      ground: write.ground,
      title: null,
    });
    return { ok: true, status: write.status, notice };
  }

  return toModerationActionResult(write);
}
