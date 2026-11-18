import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { MODERATION_OPERATION } from "../model/admin.constants";
import type { TargetUserInput } from "../model/admin.schema";
import type { AdminFailure, ModerationWriteResult, NonRestrictingWriteResult } from "../model/admin.types";
import {
  banAnswerSchema,
  blockAnswerSchema,
  revokeAnswerSchema,
  unblockAnswerSchema,
  type RestrictionAnswer,
} from "../model/moderation-rpc.schema";

import { toAdminFailure, withStatus } from "./rpc-failure";

// Every call runs with the cookie client as the signed-in admin; the database checks the admin right itself (design D2)
// and a caller who is not one fails with 42501, which is `forbidden` here. A failure is a value, never a throw, and a
// log line holds the operation and the failure kind only (NFR-6).

interface ModerationCall<Answer> {
  readonly operation: string;
  readonly rpcName: string;
  readonly answerSchema: z.ZodType<Answer>;
}

type CallOutcome<Answer> =
  { readonly ok: true; readonly answer: Answer } | { readonly ok: false; readonly failure: AdminFailure };

/** One RPC with the target's id, its answer parsed against the function's own contract. */
async function callRpc<Answer>(call: ModerationCall<Answer>, input: TargetUserInput): Promise<CallOutcome<Answer>> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc(call.rpcName, { target_user_id: input.userId });
    if (response.error) {
      return { ok: false, failure: toAdminFailure(call.operation, withStatus(response.error, response.status)) };
    }

    const parsed = call.answerSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(call.operation, parsed.error) };
    return { ok: true, answer: parsed.data };
  } catch (error) {
    // A config error, or an unexpected throw (a network failure): still a value.
    return { ok: false, failure: toAdminFailure(call.operation, error) };
  }
}

async function callModeration(
  call: ModerationCall<{ status: NonRestrictingStatus }>,
  input: TargetUserInput,
): Promise<NonRestrictingWriteResult> {
  const outcome = await callRpc(call, input);
  return outcome.ok ? { ok: true, status: outcome.answer.status } : outcome;
}

type NonRestrictingStatus = Extract<NonRestrictingWriteResult, { readonly ok: true }>["status"];

async function callRestriction(
  call: ModerationCall<RestrictionAnswer>,
  input: TargetUserInput,
): Promise<ModerationWriteResult> {
  const outcome = await callRpc(call, input);
  if (!outcome.ok) return outcome;
  const { answer } = outcome;
  if ("notice_email" in answer) {
    return { ok: true, status: answer.status, noticeEmail: answer.notice_email, ground: answer.ground };
  }
  return { ok: true, status: answer.status };
}

/** Calls `admin_block_user`; the caller's admin right is checked inside the database (design D2). */
export async function blockUser(input: TargetUserInput): Promise<ModerationWriteResult> {
  return callRestriction(
    { operation: MODERATION_OPERATION.block, rpcName: "admin_block_user", answerSchema: blockAnswerSchema },
    input,
  );
}

/** Calls `admin_unblock_user`. */
export async function unblockUser(input: TargetUserInput): Promise<NonRestrictingWriteResult> {
  return callModeration(
    { operation: MODERATION_OPERATION.unblock, rpcName: "admin_unblock_user", answerSchema: unblockAnswerSchema },
    input,
  );
}

/** Calls `admin_ban_user`. */
export async function banUser(input: TargetUserInput): Promise<ModerationWriteResult> {
  return callRestriction(
    { operation: MODERATION_OPERATION.ban, rpcName: "admin_ban_user", answerSchema: banAnswerSchema },
    input,
  );
}

/** Calls `admin_revoke_sessions`. */
export async function revokeSessions(input: TargetUserInput): Promise<NonRestrictingWriteResult> {
  return callModeration(
    { operation: MODERATION_OPERATION.revoke, rpcName: "admin_revoke_sessions", answerSchema: revokeAnswerSchema },
    input,
  );
}
