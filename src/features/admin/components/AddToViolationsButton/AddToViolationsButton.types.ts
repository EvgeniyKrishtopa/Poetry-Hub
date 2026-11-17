import type { ViolationContent } from "../../model/violation.types";

export interface AddToViolationsButtonProps {
  readonly authorProfileId: string;
  /** Set on a poem or collection page; absent on the author page. */
  readonly content?: ViolationContent;
}
