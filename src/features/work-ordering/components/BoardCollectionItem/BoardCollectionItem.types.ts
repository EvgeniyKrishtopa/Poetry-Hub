import type { BoardCollection } from "../../model/work-ordering.types";

export interface BoardCollectionItemProps {
  readonly collection: BoardCollection;
  /** True while this collection is the one held: it travels whole, with its poems. */
  readonly isLifted: boolean;
  /** True while a held poem has entered this collection from another list. */
  readonly isTarget: boolean;
  readonly heldPoemId: string | null;
  readonly handlesDisabled: boolean;
}
