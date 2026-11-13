import type { Arrangement } from "../../model/work-ordering.types";

export interface SortableWorkBoardProps {
  /** The stored collections the board starts from and returns to after a refusal. */
  readonly collections: Arrangement["collections"];
  /** The stored free poems the board starts from and returns to after a refusal. */
  readonly freePoems: Arrangement["freePoems"];
}
