import type { ReactNode } from "react";

/** Slots the route file fills, so poem-management never imports another feature (add-poem-collections D3). */
export interface MyPoemsPageProps {
  /** One-time notices rendered next to the deleted-poem notice, outside the Suspense, on every branch. */
  readonly notices?: ReactNode;
  /** Rendered after «Добавить новое произведение» in the button row, on the public-profile branch only. */
  readonly actions?: ReactNode;
  /**
   * Rendered below the button row, on the public-profile branch only: the collections and the free poems, which the
   * slot's own feature reads and arranges (drag-and-drop-ordering D3).
   */
  readonly board?: ReactNode;
}
