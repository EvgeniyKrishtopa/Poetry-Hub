import type { ViolationCase } from "../../model/violation.types";

export interface ViolationCaseRowProps {
  readonly violationCase: ViolationCase;
  /**
   * The instant the server rendered the list, as an ISO timestamp. The status is derived from it, never from the
   * browser's clock, so the server and the browser print the same status and a refresh recomputes it.
   */
  readonly renderedAt: string;
}
