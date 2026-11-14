import { banUserAction } from "../../actions/ban-user.actions";
import { blockUserAction } from "../../actions/block-user.actions";
import { revokeSessionsAction } from "../../actions/revoke-sessions.actions";
import { unblockUserAction } from "../../actions/unblock-user.actions";
import type { ModerationActionKind, ModerationActionResult } from "../../model/admin.types";

const ACTIONS = {
  block: blockUserAction,
  unblock: unblockUserAction,
  revoke: revokeSessionsAction,
  ban: banUserAction,
} as const satisfies Record<
  ModerationActionKind,
  (input: { userId: string }) => Promise<{ data?: ModerationActionResult }>
>;

/** A server answer that never arrived (a thrown error, a rejected input) reads as an outage: nothing changed. */
const NO_ANSWER: ModerationActionResult = { ok: false, reason: "unavailable" };

/** Calls one moderation Server Action and always answers with a result, never a throw. */
export async function callModeration(kind: ModerationActionKind, userId: string): Promise<ModerationActionResult> {
  try {
    return (await ACTIONS[kind]({ userId })).data ?? NO_ANSWER;
  } catch {
    return NO_ANSWER;
  }
}
