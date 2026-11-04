import { useEffect, useId, useMemo, useRef, useState } from "react";

import { TITLE_FIELD_NAME } from "../model/poem-management.constants";
import type { PoemFormField } from "../model/poem-management.types";

import type { PoemFormFieldIds, PoemFormHost } from "./use-poem-form.types";

/** Where focus goes once the form is enabled again: a field, or the failure alert (add-poem-creation NFR-7). */
type PoemFocusTarget = PoemFormField | "alert";

interface FocusRequest {
  readonly target: PoemFocusTarget;
}

interface PoemFormFocus {
  readonly fieldIds: PoemFormFieldIds;
  /** A new key remounts the editor on its editor tab, so an invalid text can take focus. */
  readonly editorKey: number;
  /** Focuses `target` once the form is enabled again. */
  readonly requestFocus: (target: PoemFocusTarget) => void;
  /** Starts the editor fresh: its own tab and textarea state are dropped. */
  readonly remountEditor: () => void;
}

/** Where focus goes and the ids it finds the fields by; holds no field values (edit-poem design D4). */
export function usePoemFormFocus({ isPending, formRef, alertRef }: PoemFormHost): PoemFormFocus {
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const handledFocusRef = useRef<FocusRequest | null>(null);
  const textId = useId();
  const genreId = useId();
  const illustrationId = useId();
  // Built once: both the effect and the fields read it.
  const fieldIds = useMemo<PoemFormFieldIds>(
    () => ({ text: textId, genreId, illustration: illustrationId }),
    [textId, genreId, illustrationId],
  );

  useEffect(() => {
    if (isPending || focusRequest === null || handledFocusRef.current === focusRequest) return;
    handledFocusRef.current = focusRequest;

    const { target } = focusRequest;
    if (target === "alert") {
      alertRef.current?.focus();
      return;
    }
    const element =
      target === TITLE_FIELD_NAME
        ? formRef.current?.elements.namedItem(TITLE_FIELD_NAME)
        : document.getElementById(fieldIds[target]);
    if (element instanceof HTMLElement) element.focus();
  }, [focusRequest, isPending, formRef, alertRef, fieldIds]);

  function remountEditor() {
    setEditorKey((key) => key + 1);
  }

  function requestFocus(target: PoemFocusTarget) {
    // The editor may show its preview tab, where the textarea doesn't exist.
    if (target === "text") remountEditor();
    setFocusRequest({ target });
  }

  return { fieldIds, editorKey, requestFocus, remountEditor };
}
