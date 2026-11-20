import type { ViolationContent } from "../../model/violation.types";

export interface AddToViolationsControlProps {
  /** The profile id `may_moderate_author` needs to decide whether the control shows. */
  readonly authorId: string;
  /** Who the ground dialog names. */
  readonly authorName: string;
  readonly content?: ViolationContent;
}
