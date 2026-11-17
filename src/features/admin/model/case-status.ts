import type { CaseStatus } from "./violation.types";

/** A case's status from `warnedAt` and the current time; the 24 h boundary is `WARNING_PERIOD_MS` (design D2). */
export function deriveCaseStatus(warnedAt: string | null, now: Date): CaseStatus {
  void warnedAt;
  void now;
  throw new Error("not implemented");
}

/** The instant the warned user's period ends, as an ISO timestamp. */
export function deriveCaseDeadline(warnedAt: string): string {
  void warnedAt;
  throw new Error("not implemented");
}
