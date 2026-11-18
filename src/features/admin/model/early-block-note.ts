import { EARLY_BLOCK_COPY } from "./admin-messages";
import { deriveCaseDeadline } from "./case-status";
import { formatAdminDateTime } from "./format-admin-date";
import { CASE_STATUS, VIOLATION_GROUND } from "./violation.constants";
import type { CaseStatus, ViolationGround } from "./violation.types";

/** Why a block or a ban asks first: no warning was sent, or its deadline has not passed (design D6). */
export type EarlyBlockNote =
  { readonly kind: "not-warned" } | { readonly kind: "deadline-open"; readonly deadlineIso: string };

/**
 * The note an early block or ban carries, or `null` when the restriction is not early: a `malicious-activity` case
 * has no warning step, and a `harmful-content` case whose deadline passed has had its reminder (FR-8). `warnedAt` is
 * set whenever the status is not `waiting`.
 */
export function earlyBlockNoteOf(
  ground: ViolationGround,
  status: CaseStatus,
  warnedAt: string | null,
): EarlyBlockNote | null {
  if (ground !== VIOLATION_GROUND.harmfulContent) return null;
  if (status === CASE_STATUS.waiting) return { kind: "not-warned" };
  if (status === CASE_STATUS.warned && warnedAt !== null) {
    return { kind: "deadline-open", deadlineIso: deriveCaseDeadline(warnedAt) };
  }
  return null;
}

/** The line under the dialog's description, the same for the block and the ban confirmation. */
export function earlyBlockNoteText(note: EarlyBlockNote): string {
  if (note.kind === "not-warned") return EARLY_BLOCK_COPY.notWarned;
  return EARLY_BLOCK_COPY.deadlineOpen(formatAdminDateTime(note.deadlineIso));
}
