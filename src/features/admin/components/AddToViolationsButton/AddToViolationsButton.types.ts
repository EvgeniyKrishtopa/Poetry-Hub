import type { ViolationContent } from "../../model/violation.types";

export interface AddToViolationsButtonProps {
  readonly authorProfileId: string;
  /** Who the ground dialog names; the pages already read it. */
  readonly authorName: string;
  /** Set on a poem or collection page; absent on the author page. */
  readonly content?: ViolationContent;
}
