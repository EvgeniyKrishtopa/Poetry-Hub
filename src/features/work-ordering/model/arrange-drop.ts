import type { Arrangement, Drop } from "./work-ordering.types";

/**
 * The arrangement after one drop, as the board shows it while the move is sending: the moved item at the dropped
 * place, every other item in its relative order, and the arrangement itself when nothing changed (FR-2 to FR-5).
 */
export function arrangeDrop(arrangement: Arrangement, drop: Drop): Arrangement {
  void arrangement;
  void drop;
  throw new Error("not implemented");
}
