import { toFailureReason } from "./action-results";
import { VIOLATION_DB_STATUS } from "./violation.constants";
import type {
  AddCaseActionResult,
  CaseFailureReason,
  CaseWriteResult,
  RemoveCaseActionResult,
  SendWarningActionResult,
  SetCaseGroundActionResult,
  ViolationDbStatus,
  WarningStopReason,
} from "./violation.types";

// A status outside the function's own contract can't come out of the DAL (each parse admits its own statuses only);
// if one ever does, it reads as an outage, the same as `unknown`, and never as a guessed success.

function failed(reason: CaseFailureReason): { readonly ok: false; readonly reason: CaseFailureReason } {
  return { ok: false, reason };
}

/** The add function's answer in the terms the dialogs show (FR-1, FR-2, FR-15). */
export function toAddCaseActionResult(write: CaseWriteResult): AddCaseActionResult {
  if (!write.ok) return failed(toFailureReason(write.failure));

  switch (write.status) {
    case VIOLATION_DB_STATUS.added:
      return { ok: true, status: "added" };
    case VIOLATION_DB_STATUS.alreadyInList:
      return { ok: true, status: "already-in-list" };
    case VIOLATION_DB_STATUS.targetIsAdmin:
      return failed("target-is-admin");
    case VIOLATION_DB_STATUS.alreadyRestricted:
      return failed("already-restricted");
    case VIOLATION_DB_STATUS.notFound:
      return failed("not-found");
    case VIOLATION_DB_STATUS.contentNotFound:
      return failed("content-not-found");
    default:
      return failed("unavailable");
  }
}

/** The set-ground function's answer; a missing case is its own reason, not "user not found". */
export function toSetCaseGroundActionResult(write: CaseWriteResult): SetCaseGroundActionResult {
  if (!write.ok) return failed(toFailureReason(write.failure));

  switch (write.status) {
    case VIOLATION_DB_STATUS.groundChanged:
      return { ok: true };
    case VIOLATION_DB_STATUS.notFound:
      return failed("case-not-found");
    default:
      return failed("unavailable");
  }
}

function failedWarning(reason: WarningStopReason): { readonly ok: false; readonly reason: WarningStopReason } {
  return { ok: false, reason };
}

/** Why `admin_start_warning` said not to send: each answer is a refusal of its own, and none sends an email (FR-6). */
export function toWarningRefusal(status: Exclude<ViolationDbStatus, "ready">): SendWarningActionResult {
  switch (status) {
    case VIOLATION_DB_STATUS.notFound:
      return failedWarning("case-not-found");
    case VIOLATION_DB_STATUS.wrongGround:
      return failedWarning("wrong-ground");
    case VIOLATION_DB_STATUS.alreadyWarned:
      return failedWarning("already-warned");
    case VIOLATION_DB_STATUS.alreadyRestricted:
      return failedWarning("already-restricted");
    case VIOLATION_DB_STATUS.noAddress:
      return failedWarning("no-address");
    default:
      return failedWarning("unavailable");
  }
}

/** `admin_mark_warned`'s answer after the email was accepted; `already-warned` keeps the first deadline (FR-11). */
export function toMarkWarnedActionResult(write: CaseWriteResult): SendWarningActionResult {
  if (!write.ok) return failedWarning(toFailureReason(write.failure));

  switch (write.status) {
    case VIOLATION_DB_STATUS.warned:
      return { ok: true };
    case VIOLATION_DB_STATUS.alreadyWarned:
      return failedWarning("already-warned");
    case VIOLATION_DB_STATUS.notFound:
      return failedWarning("case-not-found");
    default:
      return failedWarning("unavailable");
  }
}

/** The remove function's answer. */
export function toRemoveCaseActionResult(write: CaseWriteResult): RemoveCaseActionResult {
  if (!write.ok) return failed(toFailureReason(write.failure));

  switch (write.status) {
    case VIOLATION_DB_STATUS.removed:
      return { ok: true };
    case VIOLATION_DB_STATUS.notFound:
      return failed("case-not-found");
    default:
      return failed("unavailable");
  }
}
