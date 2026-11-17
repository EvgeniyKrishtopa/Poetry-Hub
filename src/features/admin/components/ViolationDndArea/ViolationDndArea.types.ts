import type { ReactNode } from "react";

export interface ViolationDndAreaProps {
  /** The link and the user list: the rows are draggables, the link is the droppable. */
  readonly children: ReactNode;
}
