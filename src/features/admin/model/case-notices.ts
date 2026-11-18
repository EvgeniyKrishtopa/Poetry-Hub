import {
  ADD_CASE_RESULT_MESSAGES,
  ADD_TO_VIOLATIONS_COPY,
  CASE_FAILURE_MESSAGES,
  CONTENT_GONE_MESSAGES,
  DELETE_NOTICE_FAILED_COPY,
  MODERATION_RESULT_MESSAGES,
  NOTICE_RESULT_SUFFIX,
} from "./admin-messages";
import type { ModerationActionResult } from "./admin.types";
import type {
  ActionNoticeResult,
  AddCaseActionResult,
  AdminNotice,
  CaseFailureReason,
  FailedNoticeValue,
  ViolationContentKind,
} from "./violation.types";

/**
 * The line for a case action that changed nothing. `content-not-found` is worded by the kind of content that
 * would have been recorded; without a kind (the `/admin` list records none) it can't be worded, so it reads as invalid.
 */
export function caseFailureMessage(reason: CaseFailureReason, contentKind: ViolationContentKind | null): string {
  if (reason !== "content-not-found") return CASE_FAILURE_MESSAGES[reason];
  if (contentKind === null) return CASE_FAILURE_MESSAGES.invalid;
  return CONTENT_GONE_MESSAGES[contentKind];
}

/** The line after an add: «added» and «already on the list» are results, everything else a failure (FR-1, FR-15). */
export function describeAddResult(
  result: AddCaseActionResult,
  contentKind: ViolationContentKind | null,
): AdminNotice {
  if (!result.ok) return { tone: "danger", text: caseFailureMessage(result.reason, contentKind) };
  if (result.status === "added") return { tone: "success", text: ADD_CASE_RESULT_MESSAGES.added };
  return { tone: "neutral", text: ADD_CASE_RESULT_MESSAGES["already-in-list"] };
}

/** The line after an add from a public page, which names the author instead of a user (FR-2, FR-15). */
export function describeAuthorAddResult(
  result: AddCaseActionResult,
  contentKind: ViolationContentKind | null,
): AdminNotice {
  if (!result.ok) return { tone: "danger", text: caseFailureMessage(result.reason, contentKind) };
  if (result.status === "added") return { tone: "success", text: ADD_TO_VIOLATIONS_COPY.added };
  return { tone: "neutral", text: ADD_TO_VIOLATIONS_COPY["already-in-list"] };
}

/** The author page's line for an admin delete whose email did not go out, by what was deleted (FR-14). */
export function describeFailedDeleteNotice(notice: FailedNoticeValue): string {
  const base = DELETE_NOTICE_FAILED_COPY[notice.deleted];
  if (notice.cause === "no-address") return `${base}${DELETE_NOTICE_FAILED_COPY.noAddress}`;
  return base;
}

function emailSuffix(notice: ActionNoticeResult): AdminNotice {
  if (notice.outcome === "sent") return { tone: "success", text: NOTICE_RESULT_SUFFIX.sent };
  if (notice.outcome === "skipped") return { tone: "success", text: "" };
  if (notice.cause === "no-address") return { tone: "neutral", text: NOTICE_RESULT_SUFFIX.noAddress };
  return { tone: "neutral", text: NOTICE_RESULT_SUFFIX.failed };
}

/**
 * The line after a successful moderation action. A block or a ban also says what the standard email did, so the
 * admin learns that the action is done and whether the user was told (FR-14).
 */
export function describeModerationSuccess(result: Extract<ModerationActionResult, { readonly ok: true }>): AdminNotice {
  if (result.status === "no-sessions") return { tone: "neutral", text: MODERATION_RESULT_MESSAGES["no-sessions"] };
  if (result.status === "blocked" || result.status === "banned") {
    const suffix = emailSuffix(result.notice);
    return { tone: suffix.tone, text: `${MODERATION_RESULT_MESSAGES[result.status]}${suffix.text}` };
  }
  return { tone: "success", text: MODERATION_RESULT_MESSAGES[result.status] };
}
