import type { ReactNode } from "react";

import type { CollectedPoemsRead } from "../../model/poem-management.types";

/** Slots the route file fills, so poem-management never imports collection-management (add-poem-collections D3). */
export interface MyPoemsPageProps {
  /** One-time notices rendered next to the deleted-poem notice, outside the Suspense, on every branch. */
  readonly notices?: ReactNode;
  /** Rendered after «Добавить новое произведение» in the button row, on the public-profile branch only. */
  readonly actions?: ReactNode;
  /** Rendered between the button row and the poem list, on the public-profile branch only. */
  readonly beforeList?: ReactNode;
  /**
   * Reads which own poems are in a collection, so the list shows free poems only. Called inside the Suspense boundary,
   * on the public-profile branch only; required, so the list can never fall back to every poem (show-only-free-poems D1).
   */
  readonly readCollectedPoems: () => Promise<CollectedPoemsRead>;
}
