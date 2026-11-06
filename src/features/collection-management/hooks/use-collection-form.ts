import { useEffect, useRef, useState } from "react";

import { collectionFormSchema, toCollectionFieldErrors } from "../model/collection-form.schema";
import { type CollectionFormValues, isCollectionFormChanged } from "../model/collection-form-values";
import { COLLECTION_FORM_FIELDS } from "../model/collection-management.constants";
import type { CollectionField, CollectionFieldErrors } from "../model/collection-management.types";

import type { CollectionFormCheck, CollectionFormHost, CollectionFormState } from "./use-collection-form.types";

const NO_FIELD_ERRORS: CollectionFieldErrors = {};

/** A new object per request, so the same field asked for twice is focused twice. */
interface FocusRequest {
  readonly field: CollectionField;
}

/** The two drafts, the browser check, focus, change detection, and reset, for both forms (design D5, D6). */
export function useCollectionForm(
  initial: CollectionFormValues,
  { isPending, formRef }: CollectionFormHost,
): CollectionFormState {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [fieldErrors, setFieldErrors] = useState<CollectionFieldErrors>(NO_FIELD_ERRORS);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const handledFocusRef = useRef<FocusRequest | null>(null);
  const values: CollectionFormValues = { title, description };

  // A disabled fieldset can't take focus: a server's field errors wait until the send is over.
  useEffect(() => {
    if (isPending || focusRequest === null || handledFocusRef.current === focusRequest) return;
    handledFocusRef.current = focusRequest;
    const element = formRef.current?.elements.namedItem(focusRequest.field);
    if (element instanceof HTMLElement) element.focus();
  }, [isPending, focusRequest, formRef]);

  function showFieldErrors(errors: CollectionFieldErrors) {
    setFieldErrors(errors);
    const first = COLLECTION_FORM_FIELDS.find((field) => errors[field] !== undefined);
    if (first !== undefined) setFocusRequest({ field: first });
  }

  function validate(): CollectionFormCheck {
    const check = collectionFormSchema.safeParse(values);
    if (!check.success) {
      const errors = toCollectionFieldErrors(check.error);
      showFieldErrors(errors);
      return { ok: false, fieldErrors: errors };
    }
    setFieldErrors(NO_FIELD_ERRORS);
    return { ok: true, values };
  }

  function reset() {
    setTitle(initial.title);
    setDescription(initial.description);
    setFieldErrors(NO_FIELD_ERRORS);
  }

  return {
    values,
    setTitle,
    setDescription,
    fieldErrors,
    isChanged: isCollectionFormChanged(initial, values),
    validate,
    showFieldErrors,
    reset,
  };
}
