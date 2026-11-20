import type { ReactNode } from "react";

export interface ViolationDndAreaProps {
  /** The user list: its rows are the draggables, and the area adds the review-list link, which is the droppable. */
  readonly children: ReactNode;
}
