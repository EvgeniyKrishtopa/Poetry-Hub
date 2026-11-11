import type { BoardPoem } from "../../model/work-ordering.types";

export interface BoardPoemItemProps {
  readonly poem: BoardPoem;
  readonly isLifted: boolean;
  readonly handlesDisabled: boolean;
}
