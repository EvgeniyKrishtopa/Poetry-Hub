import type { BoardPoem, PoemContainer } from "../../model/work-ordering.types";

export interface BoardPoemListProps {
  readonly container: PoemContainer;
  readonly poems: readonly BoardPoem[];
  /** The poem held right now, if a poem is held: it is drawn lifted, and an empty list shows its drop area. */
  readonly heldPoemId: string | null;
  readonly handlesDisabled: boolean;
}
