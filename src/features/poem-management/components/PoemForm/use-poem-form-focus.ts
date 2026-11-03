import { type RefObject, useEffect, useId, useMemo, useRef, useState } from "react";

import type { PoemFormField } from "../../model/poem-management.types";

/** The title input's id is TextField's own, so it is found by name. */
export const TITLE_FIELD_NAME = "title";

/** Where focus goes once the form is enabled again: a field, or the failure alert (add-poem-creation NFR-7). */
type PoemFocusTarget =PoemFormField | "alert";

interface FocusRequest {
  readonly target: PoemFocusTarget;
}

/** The ids the fields render with, so focus can find them. */
export interface PoemFormFieldIds {
  readonly text: string;
  readonly genreId: string;
  readonly illustration: string;
}

/** What focus needs from the form that owns the action and renders the alert. */
export interface PoemFormHost {
  /** The form's sending state: focus waits for the fieldset to be enabled again, since a disabled control can't take it. */
  readonly isPending: boolean;
  /** The form element, where the title input is found by name. */
  readonly formRef: RefObject<HTMLFormElement | null>;
  /** The failure alert's focusable wrapper, rendered by the form. */
  readonly alertRef: RefObject<HTMLDivElement | null>;
}

export interface PoemFormFocus {
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
