import type { ReactNode } from "react";

export interface CollectionActionsProps {
  /** `EditCollectionButton`, passed in so the edit link stays a server module. */
  readonly editButton: ReactNode;
  /** `DeleteCollectionButton`, last in the row. */
  readonly deleteButton: ReactNode;
  /** Set only when the collection has something to manage: renders `ManageCollectionPoemsButton` between the two. */
  readonly manageCollectionId?: string;
}
