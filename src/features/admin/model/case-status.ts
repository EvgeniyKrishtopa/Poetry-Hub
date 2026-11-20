import { CASE_STATUS, WARNING_PERIOD_MS } from "./violation.constants";
import type { CaseStatus } from "./violation.types";

/** A case's status from `warnedAt` and the current time; the 24 h boundary is `WARNING_PERIOD_MS` (design D2). */
export function deriveCaseStatus(warnedAt: string | null, now: Date): CaseStatus {
  if (warnedAt === null) return CASE_STATUS.waiting;
  const elapsedMs = now.getTime() - new Date(warnedAt).getTime();
  return elapsedMs < WARNING_PERIOD_MS ? CASE_STATUS.warned : CASE_STATUS.deadlinePassed;
}

/** The instant the warned user's period ends, as an ISO timestamp. */
export function deriveCaseDeadline(warnedAt: string): string {
  return new Date(new Date(warnedAt).getTime() + WARNING_PERIOD_MS).toISOString();
}
