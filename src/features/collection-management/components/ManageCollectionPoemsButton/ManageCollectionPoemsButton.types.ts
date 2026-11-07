import type { ManageCollectionPoemsError } from "../../model/collection-management.types";

export interface ManageCollectionPoemsButtonProps {
  readonly collectionId: string;
  /** Reports the alert to show under the row, or `null` to clear it on the next press. */
  readonly onError: (error: ManageCollectionPoemsError | null) => void;
}
