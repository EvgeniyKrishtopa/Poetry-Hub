import type { ReactNode } from "react";

/** Slots the route file fills, so poem-management never imports collection-management (add-poem-collections D3). */
export interface MyPoemsPageProps {
  /** One-time notices rendered next to the deleted-poem notice, outside the Suspense, on every branch. */
  readonly notices?: ReactNode;
  /** Rendered after «Добавить новое произведение» in the button row, on the public-profile branch only. */
  readonly actions?: ReactNode;
  /** Rendered between the button row and the poem list, on the public-profile branch only. */
  readonly beforeList?: ReactNode;
}
