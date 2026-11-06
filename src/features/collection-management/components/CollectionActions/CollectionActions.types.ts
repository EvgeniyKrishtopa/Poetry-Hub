import type { ReactNode } from "react";

export interface CollectionActionsProps {
  /** `EditCollectionButton` and `DeleteCollectionButton`, passed in so the edit link stays a server module. */
  readonly children: ReactNode;
}
