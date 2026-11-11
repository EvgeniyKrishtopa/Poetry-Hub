import type { Arrangement } from "../../model/work-ordering.types";

export interface WorkBoardIslandProps {
  /** The stored arrangement the board starts from and returns to after a refusal. */
  readonly arrangement: Arrangement;
}
