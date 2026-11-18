import type { EmailFailureReason } from "@/shared/lib/email";

import type { AdminDeleteKind, AdminFailure } from "./admin.types";
import type {
  ACTION_NOTICE_KIND,
  CASE_STATUS,
  NOTICE_LOG_OUTCOME,
  VIOLATION_CONTENT_KIND,
  VIOLATION_DB_STATUS,
  VIOLATION_GROUND,
} from "./violation.constants";

export type ViolationGround = (typeof VIOLATION_GROUND)[keyof typeof VIOLATION_GROUND];
export type ViolationContentKind = (typeof VIOLATION_CONTENT_KIND)[keyof typeof VIOLATION_CONTENT_KIND];
export type CaseStatus = (typeof CASE_STATUS)[keyof typeof CASE_STATUS];
export type ViolationDbStatus = (typeof VIOLATION_DB_STATUS)[keyof typeof VIOLATION_DB_STATUS];
export type ActionNoticeKind = (typeof ACTION_NOTICE_KIND)[keyof typeof ACTION_NOTICE_KIND];
export type NoticeLogOutcome = (typeof NOTICE_LOG_OUTCOME)[keyof typeof NOTICE_LOG_OUTCOME];

/** The poem or collection that prompted a case; `title` is null once the content is deleted (design D3). */
export interface ViolationContent {
  readonly kind: ViolationContentKind;
  readonly id: string;
  readonly title: string | null;
}

/** One open case of the review list; the status is derived from `warnedAt`, never stored. */
export interface ViolationCase {
  readonly id: string;
  readonly userId: string;
  readonly email: string;
  readonly authorName: string | null;
  readonly authorProfileId: string | null;
  readonly ground: ViolationGround;
  readonly content: ViolationContent | null;
  readonly createdAt: string;
  readonly warnedAt: string | null;
}

/** The list's answer: the cases, newest first, and whether more exist than the cap shows. */
export type ViolationListResult =
  | { readonly ok: true; readonly cases: readonly ViolationCase[]; readonly capReached: boolean }
  | { readonly ok: false; readonly failure: AdminFailure };

/** A violation function's answer for the add, set-ground and remove calls, or why it could not be asked. */
export type CaseWriteResult =
  { readonly ok: true; readonly status: ViolationDbStatus } | { readonly ok: false; readonly failure: AdminFailure };

/** `admin_start_warning`'s answer: ready with the address to send to, or the reason not to send. */
export type StartWarningWriteResult =
  | { readonly ok: true; readonly status: "ready"; readonly email: string }
  | { readonly ok: true; readonly status: Exclude<ViolationDbStatus, "ready"> }
  | { readonly ok: false; readonly failure: AdminFailure };

/** Why a case action did not change anything, in the terms the row and the dialogs show (FR-15). */
export type CaseFailureReason =
  | "already-restricted"
  | "target-is-admin"
  | "not-found"
  | "case-not-found"
  | "content-not-found"
  | "forbidden"
  | "unauthenticated"
  | "unavailable"
  | "invalid";

export type AddCaseActionResult =
  | { readonly ok: true; readonly status: "added" | "already-in-list" }
  | { readonly ok: false; readonly reason: CaseFailureReason };

export type SetCaseGroundActionResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: CaseFailureReason };

export type RemoveCaseActionResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: CaseFailureReason };

/** What the warning action can fail with besides the shared reasons (design D4). */
export type WarningStopReason =CaseFailureReason | "wrong-ground" | "already-warned" | "no-address";

/** `outcomeUnknown` locks the message in the modal, so a retry carries the same text (design D4). */
export type SendWarningActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: WarningStopReason }
  | {
      readonly ok: false;
      readonly reason: "email-failed";
      readonly cause: EmailFailureReason;
      readonly outcomeUnknown: boolean;
    };

/** What a standard notice needs from the restricting function's answer; the title comes from the database only. */
export interface ActionNoticeContent {
  readonly kind: ActionNoticeKind;
  readonly ground: ViolationGround | null;
  readonly title: string | null;
}

export interface SendActionNoticeInput extends ActionNoticeContent {
  readonly userId: string;
  /** Null when the account has no address on file. */
  readonly email: string | null;
}

/** An email's fixed frame: a subject with no user text and a plain-text body. */
export interface NoticeEmailContent {
  readonly subject: string;
  readonly text: string;
}

/** What the notice step did; `failed` is still a successful action (design D5, FR-14). */
export type ActionNoticeResult =
  | { readonly outcome: "sent" }
  | { readonly outcome: "skipped" }
  | { readonly outcome: "failed"; readonly cause: "no-address" | EmailFailureReason };

/** A failed notice after an admin delete, kept for the author page's one-time notice (design D7). */
export interface FailedNoticeValue {
  readonly deleted: AdminDeleteKind;
  readonly cause: "no-address" | EmailFailureReason;
}
