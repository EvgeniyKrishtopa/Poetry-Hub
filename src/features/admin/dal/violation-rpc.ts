import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { AdminFailure } from "../model/admin.types";
import { VIOLATION_DB_STATUS, VIOLATION_LIST_LIMIT, VIOLATION_OPERATION } from "../model/violation.constants";
import {
  type AddViolationCaseForAuthorInput,
  type AddViolationCaseInput,
  type CaseIdInput,
  type SetCaseGroundInput,
} from "../model/violation.schema";
import {
  addAnswerSchema,
  caseRowSchema,
  markWarnedAnswerSchema,
  removeAnswerSchema,
  setGroundAnswerSchema,
  startWarningAnswerSchema,
  type CaseRow,
} from "../model/violation-rpc.schema";
import type {
  ActionNoticeKind,
  CaseWriteResult,
  NoticeLogOutcome,
  StartWarningWriteResult,
  ViolationCase,
  ViolationListResult,
} from "../model/violation.types";

import { logFailure, toAdminFailure, withStatus } from "./rpc-failure";

// Every call runs with the cookie client as the signed-in admin; the database checks the admin right itself and a
// caller who is not one fails with 42501, which is `forbidden` here. A failure is a value, never a throw, and a log
// line holds the operation and the failure kind only.

type RpcOutcome<Answer> =
  { readonly ok: true; readonly answer: Answer } | { readonly ok: false; readonly failure: AdminFailure };

/** One RPC, its answer parsed against the function's own contract. */
async function callRpc<Answer>(
  operation: string,
  rpcName: string,
  args: Record<string, unknown>,
  answerSchema: z.ZodType<Answer>,
): Promise<RpcOutcome<Answer>> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc(rpcName, args);
    if (response.error) {
      return { ok: false, failure: toAdminFailure(operation, withStatus(response.error, response.status)) };
    }

    const parsed = answerSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(operation, parsed.error) };
    return { ok: true, answer: parsed.data };
  } catch (error) {
    // A config error, or an unexpected throw (a network failure): still a value.
    return { ok: false, failure: toAdminFailure(operation, error) };
  }
}

async function callWrite(
  operation: string,
  rpcName: string,
  args: Record<string, unknown>,
  answerSchema: z.ZodType<{ status: CaseWriteStatus }>,
): Promise<CaseWriteResult> {
  const outcome = await callRpc(operation, rpcName, args, answerSchema);
  return outcome.ok ? { ok: true, status: outcome.answer.status } : outcome;
}

type CaseWriteStatus = Extract<CaseWriteResult, { readonly ok: true }>["status"];

/** Calls `admin_add_violation_case`. */
export async function addViolationCase(input: AddViolationCaseInput): Promise<CaseWriteResult> {
  return callWrite(
    VIOLATION_OPERATION.add,
    "admin_add_violation_case",
    {
      target_user_id: input.userId,
      ground: input.ground,
      content_kind: input.content?.kind ?? null,
      content_id: input.content?.id ?? null,
    },
    addAnswerSchema,
  );
}

/** Calls `admin_add_violation_case_for_author`: the public pages know a profile id, not a user id. */
export async function addViolationCaseForAuthor(input: AddViolationCaseForAuthorInput): Promise<CaseWriteResult> {
  return callWrite(
    VIOLATION_OPERATION.addForAuthor,
    "admin_add_violation_case_for_author",
    {
      author_profile_id: input.authorProfileId,
      ground: input.ground,
      content_kind: input.content?.kind ?? null,
      content_id: input.content?.id ?? null,
    },
    addAnswerSchema,
  );
}

function toViolationCase(row: CaseRow): ViolationCase {
  // The row schema already refused a half-set pair; the check here narrows the types for the content.
  const content =
    row.content_kind !== null && row.content_id !== null
      ? { kind: row.content_kind, id: row.content_id, title: row.content_title }
      : null;
  return {
    id: row.id,
    userId: row.user_id,
    email: row.user_email,
    authorName: row.author_name,
    authorProfileId: row.author_profile_id,
    ground: row.ground,
    content,
    createdAt: row.created_at,
    warnedAt: row.warned_at,
  };
}

/** Calls `admin_list_violation_cases`: open cases, newest first, at most `VIOLATION_LIST_LIMIT`. */
export async function listViolationCases(): Promise<ViolationListResult> {
  const outcome = await callRpc(VIOLATION_OPERATION.list, "admin_list_violation_cases", {}, z.array(caseRowSchema));
  if (!outcome.ok) return outcome;

  // The function reads one row more than the cap, so "more exist" is told apart from "exactly the cap".
  const capReached = outcome.answer.length > VIOLATION_LIST_LIMIT;
  const cases = outcome.answer.slice(0, VIOLATION_LIST_LIMIT).map(toViolationCase);
  return { ok: true, cases, capReached };
}

/** Calls `admin_set_case_ground`. */
export async function setCaseGround(input: SetCaseGroundInput): Promise<CaseWriteResult> {
  return callWrite(
    VIOLATION_OPERATION.setGround,
    "admin_set_case_ground",
    { case_id: input.caseId, ground: input.ground },
    setGroundAnswerSchema,
  );
}

/** Calls `admin_remove_violation_case`. */
export async function removeViolationCase(input: CaseIdInput): Promise<CaseWriteResult> {
  return callWrite(VIOLATION_OPERATION.remove, "admin_remove_violation_case", { case_id: input.caseId }, removeAnswerSchema);
}

/** Calls `admin_start_warning`: the checks before an email, answering with the address to send to. */
export async function startWarning(input: CaseIdInput): Promise<StartWarningWriteResult> {
  const outcome = await callRpc(
    VIOLATION_OPERATION.startWarning,
    "admin_start_warning",
    { case_id: input.caseId },
    startWarningAnswerSchema,
  );
  if (!outcome.ok) return outcome;
  if (outcome.answer.status === VIOLATION_DB_STATUS.ready) {
    return { ok: true, status: VIOLATION_DB_STATUS.ready, email: outcome.answer.email };
  }
  return { ok: true, status: outcome.answer.status };
}

/** Calls `admin_mark_warned`: sets `warned_at` once, only after the email was accepted. */
export async function markWarned(input: CaseIdInput): Promise<CaseWriteResult> {
  return callWrite(VIOLATION_OPERATION.markWarned, "admin_mark_warned", { case_id: input.caseId }, markWarnedAnswerSchema);
}

/**
 * Calls `admin_log_notice`; its arguments are enumerated and hold no address or text. Best effort: a failure is
 * logged by kind and swallowed, because the action it follows has already committed (FR-12).
 */
export async function logNotice(userId: string, kind: ActionNoticeKind, outcome: NoticeLogOutcome): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("admin_log_notice", {
      target_user_id: userId,
      notice_kind: kind,
      outcome,
    });
    if (response.error) logFailure(VIOLATION_OPERATION.logNotice, withStatus(response.error, response.status));
  } catch (error) {
    logFailure(VIOLATION_OPERATION.logNotice, error);
  }
}
