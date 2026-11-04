import type { CollectionFormValues } from "../../model/collection-form-values";

export interface EditCollectionFormProps {
  readonly collectionId: string;
  /** The values the page opened with: what change detection and discard compare against (design D6). */
  readonly stored: CollectionFormValues;
}
