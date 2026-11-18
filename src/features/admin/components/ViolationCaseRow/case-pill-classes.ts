import { CASE_STATUS } from "../../model/violation.constants";
import type { CaseStatus } from "../../model/violation.types";

/** The pill shape of `UserStateBadge`, which the status and the ground pills copy (design system, artboard 49). */
export const PILL_CLASS = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

/** A status is told apart by its frame colour: nothing yet, a warning with time left, a deadline that passed. */
export const STATUS_PILL_CLASS = {
  [CASE_STATUS.waiting]: "border-muted text-muted",
  [CASE_STATUS.warned]: "border-accent text-accent",
  [CASE_STATUS.deadlinePassed]: "border-danger text-danger",
} as const satisfies Record<CaseStatus, string>;

/** The ground pill is neutral: a plain `border` frame. */
export const GROUND_PILL_CLASS = "border-border text-foreground";
