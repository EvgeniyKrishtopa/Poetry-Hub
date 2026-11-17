import "server-only";

import type {
  AddViolationCaseForAuthorInput,
  AddViolationCaseInput,
  CaseIdInput,
  SetCaseGroundInput,
} from "../model/violation.schema";
import type {
  ActionNoticeKind,
  CaseWriteResult,
  NoticeLogOutcome,
  StartWarningWriteResult,
  ViolationListResult,
} from "../model/violation.types";

// Every call runs with the cookie client as the signed-in admin; the database checks the admin right itself. A
// failure is a value, never a throw, and a log line holds the operation and the failure kind only.

/** Calls `admin_add_violation_case`. */
export async function addViolationCase(input: AddViolationCaseInput): Promise<CaseWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_add_violation_case_for_author`: the public pages know a profile id, not a user id. */
export async function addViolationCaseForAuthor(input: AddViolationCaseForAuthorInput): Promise<CaseWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_list_violation_cases`: open cases, newest first, at most `VIOLATION_LIST_LIMIT`. */
export async function listViolationCases(): Promise<ViolationListResult> {
  throw new Error("not implemented");
}

/** Calls `admin_set_case_ground`. */
export async function setCaseGround(input: SetCaseGroundInput): Promise<CaseWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_remove_violation_case`. */
export async function removeViolationCase(input: CaseIdInput): Promise<CaseWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_start_warning`: the checks before an email, answering with the address to send to. */
export async function startWarning(input: CaseIdInput): Promise<StartWarningWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_mark_warned`: sets `warned_at` once, only after the email was accepted. */
export async function markWarned(input: CaseIdInput): Promise<CaseWriteResult> {
  void input;
  throw new Error("not implemented");
}

/** Calls `admin_log_notice`; its arguments are enumerated and hold no address or text. */
export async function logNotice(userId: string, kind: ActionNoticeKind, outcome: NoticeLogOutcome): Promise<void> {
  void userId;
  void kind;
  void outcome;
  throw new Error("not implemented");
}
