import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { MODERATION_DB_STATUS } from "../model/admin.constants";
import type { TargetUserInput } from "../model/admin.schema";
import type { ModerationDbStatus, ModerationWriteResult } from "../model/admin.types";

import { toAdminFailure, withStatus } from "./rpc-failure";

// Every call runs with the cookie client as the signed-in admin; the database checks the admin right itself (design D2)
// and a caller who is not one fails with 42501, which is `forbidden` here. Each function may answer only its own
// statuses: any other value fails the parse and is `unknown`, never a guessed success. A failure is a value, never a
// throw, and a log line holds the operation and the failure kind only (NFR-6).

const { blocked, unblocked, banned, revoked, noSessions, alreadyRestricted, notBlocked, targetIsAdmin, notFound } =
  MODERATION_DB_STATUS;

const BLOCK_OPERATION = "block user";
const UNBLOCK_OPERATION = "unblock user";
const BAN_OPERATION = "ban user";
const REVOKE_OPERATION = "revoke sessions";

const blockAnswerSchema = z.object({ status: z.enum([blocked, alreadyRestricted, targetIsAdmin, notFound]) });
const unblockAnswerSchema = z.object({ status: z.enum([unblocked, notBlocked]) });
const banAnswerSchema = z.object({ status: z.enum([banned, alreadyRestricted, targetIsAdmin, notFound]) });
const revokeAnswerSchema = z.object({ status: z.enum([revoked, noSessions, targetIsAdmin, notFound]) });

interface ModerationCall {
  readonly operation: string;
  readonly rpcName: string;
  readonly answerSchema: z.ZodType<{ status: ModerationDbStatus }>;
}

/** One RPC with the target's id, its answer parsed against the function's own statuses. */
async function callModeration(call: ModerationCall, input: TargetUserInput): Promise<ModerationWriteResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc(call.rpcName, { target_user_id: input.userId });
    if (response.error) {
      return { ok: false, failure: toAdminFailure(call.operation, withStatus(response.error, response.status)) };
    }

    const parsed = call.answerSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(call.operation, parsed.error) };
    return { ok: true, status: parsed.data.status };
  } catch (error) {
    // A config error, or an unexpected throw (a network failure): still a value.
    return { ok: false, failure: toAdminFailure(call.operation, error) };
  }
}

/** Calls `admin_block_user`; the caller's admin right is checked inside the database (design D2). */
export async function blockUser(input: TargetUserInput): Promise<ModerationWriteResult> {
  return callModeration({ operation: BLOCK_OPERATION, rpcName: "admin_block_user", answerSchema: blockAnswerSchema }, input);
}

/** Calls `admin_unblock_user`. */
export async function unblockUser(input: TargetUserInput): Promise<ModerationWriteResult> {
  return callModeration(
    { operation: UNBLOCK_OPERATION, rpcName: "admin_unblock_user", answerSchema: unblockAnswerSchema },
    input,
  );
}

/** Calls `admin_ban_user`. */
export async function banUser(input: TargetUserInput): Promise<ModerationWriteResult> {
  return callModeration({ operation: BAN_OPERATION, rpcName: "admin_ban_user", answerSchema: banAnswerSchema }, input);
}

/** Calls `admin_revoke_sessions`. */
export async function revokeSessions(input: TargetUserInput): Promise<ModerationWriteResult> {
  return callModeration(
    { operation: REVOKE_OPERATION, rpcName: "admin_revoke_sessions", answerSchema: revokeAnswerSchema },
    input,
  );
}
