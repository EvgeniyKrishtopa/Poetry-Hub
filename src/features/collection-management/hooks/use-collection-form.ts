import type { CollectionFormValues } from "../model/collection-form-values";

import type { CollectionFormState } from "./use-collection-form.types";

/** The two drafts, the browser check, focus, change detection, and reset, for both forms (design D5, D6). */
export function useCollectionForm(initial: CollectionFormValues, isPending: boolean): CollectionFormState {
  void initial;
  void isPending;
  throw new Error("not implemented");
}
