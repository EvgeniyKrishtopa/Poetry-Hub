"use client";

import { useState } from "react";

import type { FieldFormState } from "../../model/author.types";
import { getFieldErrorMessage } from "../../model/profile-form-state";

/**
 * A field's error from its last action, until the reader dismisses it (Cancel, or Edit after a
 * failed delete). Each action returns a new state object, so the next failure shows again.
 */
export function useDismissibleError<Draft>(state: FieldFormState<Draft>) {
  const [dismissedState, setDismissedState] = useState<FieldFormState<Draft> | null>(null);

  return {
    error: state === dismissedState ? undefined : getFieldErrorMessage(state),
    dismiss: () => setDismissedState(state),
  };
}
