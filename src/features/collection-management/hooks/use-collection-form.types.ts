import type { RefObject } from "react";

import type { CollectionFormValues } from "../model/collection-form-values";
import type { CollectionFieldErrors } from "../model/collection-management.types";

/** The browser check's answer: the values to send, or the errors to show (never `null` as success). */
export type CollectionFormCheck =
  | { readonly ok: true; readonly values: CollectionFormValues }
  | { readonly ok: false; readonly fieldErrors: CollectionFieldErrors };

/** What both forms take from `useCollectionForm` (design D5, D6). */
export interface CollectionFormState {
  readonly values: CollectionFormValues;
  readonly setTitle: (title: string) => void;
  readonly setDescription: (description: string) => void;
  readonly fieldErrors: CollectionFieldErrors;
  /** Derived on every render, never stored (FR-8). */
  readonly isChanged: boolean;
  /** Runs the field rules; on errors shows them and focuses the first invalid field. */
  readonly validate: () => CollectionFormCheck;
  /** Shows the server's field errors and focuses the first. */
  readonly showFieldErrors: (fieldErrors: CollectionFieldErrors) => void;
  /** Both drafts back to the initial values, errors cleared (FR-8). */
  readonly reset: () => void;
  readonly formRef: RefObject<HTMLFormElement | null>;
}
