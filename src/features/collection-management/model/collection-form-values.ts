import { normalizeCollectionDescription, normalizeCollectionTitle } from "./collection-form.schema";

/** The two fields as the form holds them: raw drafts, compared after normalization (design D6). */
export interface CollectionFormValues {
  readonly title: string;
  readonly description: string;
}

/** Whether saving would store something different: either normalized value differs (FR-8, design D6). */
export function isCollectionFormChanged(stored: CollectionFormValues, draft: CollectionFormValues): boolean {
  return (
    normalizeCollectionTitle(draft.title) !== normalizeCollectionTitle(stored.title) ||
    normalizeCollectionDescription(draft.description) !== normalizeCollectionDescription(stored.description)
  );
}
