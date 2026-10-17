"use client";

import { startTransition, useActionState, useOptimistic, useState } from "react";

import { FIELD_ACTION, FORM_STATUS } from "../model/author.constants";
import type { FieldActionKind, FieldFormState, FieldMode, ProfileActionResponse } from "../model/author.types";
import { getFieldMode } from "../model/field-mode";
import { toFieldFormState } from "../model/profile-form-state";

import type { FieldEditorControls } from "./profile-field.types";
import { settleProfileAction } from "./settle-profile-action";
import { useDismissibleError } from "./use-dismissible-error";

type FieldIntent<Draft> =
  | { readonly kind: typeof FIELD_ACTION.save; readonly draft: Draft }
  | { readonly kind: typeof FIELD_ACTION.delete };

interface ProfileFieldOptions<Value, Draft> {
  /** The value in props: after a successful action the re-rendered page already holds the new one (design D3). */
  readonly savedValue: Value | null;
  readonly controls: FieldEditorControls;
  readonly save: (draft: Draft) => Promise<ProfileActionResponse>;
  readonly remove: () => Promise<ProfileActionResponse>;
  /** What the field shows while a save is pending. */
  readonly toPendingValue: (draft: Draft) => Value;
  /** Stay in edit mode after a failed save, with the draft kept (FR-7); the photo input can't be refilled, so it doesn't. */
  readonly keepEditingOnFailure: boolean;
  /** Runs once the action has settled, before the transition commits. */
  readonly onSettled?: () => void;
}

export interface ProfileField<Value, Draft> {
  readonly mode: FieldMode;
  readonly shownValue: Value | null;
  /** Which action is pending, or `null` when none is. */
  readonly pendingKind: FieldActionKind | null;
  readonly error: string | undefined;
  readonly disabled: boolean;
  /**
   * The view's first button takes focus when it mounts: set by Cancel and by a settled action that
   * leaves edit mode, so a keyboard user doesn't fall to the page body (NFR-5). Off on first load.
   */
  readonly restoreFocus: boolean;
  readonly startEditing: () => void;
  readonly cancelEditing: () => void;
  readonly submit: (draft: Draft) => void;
  readonly remove: () => void;
}

const IDLE: FieldFormState<never> = { status: FORM_STATUS.idle };

/**
 * One field's edit mode, optimistic value, and action (design D6): the field leaves edit mode as
 * soon as an action starts, shows the submitted value (or the empty state for a delete) while it is
 * pending, and falls back to the props when the transition settles.
 */
export function useProfileField<Value, Draft>({
  savedValue,
  controls,
  save,
  remove,
  toPendingValue,
  keepEditingOnFailure,
  onSettled,
}: ProfileFieldOptions<Value, Draft>): ProfileField<Value, Draft> {
  const [isEditing, setIsEditing] = useState(false);
  const [restoreFocus, setRestoreFocus] = useState(false);
  const [shownValue, setShownValue] = useOptimistic(savedValue);
  const [pendingKind, setPendingKind] = useOptimistic<FieldActionKind | null>(null);

  function setEditing(next: boolean) {
    setIsEditing(next);
    controls.onEditingChange(next);
  }

  function showPending(intent: FieldIntent<Draft>) {
    controls.onActionStart();
    setPendingKind(intent.kind);
    setShownValue(intent.kind === FIELD_ACTION.save ? toPendingValue(intent.draft) : null);
  }

  function callAction(intent: FieldIntent<Draft>): Promise<ProfileActionResponse> {
    return intent.kind === FIELD_ACTION.save ? save(intent.draft) : remove();
  }

  function finish(next: FieldFormState<Draft | null>) {
    const saved = next.status === FORM_STATUS.saved;
    if (saved || !keepEditingOnFailure) setEditing(false);
    controls.onActionEnd(saved);
  }

  /**
   * Starts an action. The focus flag is set here, synchronously: set after the action's `await`, it
   * would commit after the view's buttons have already remounted. A form that a failed save sends
   * the reader back to focuses its own control instead.
   */
  function start(intent: FieldIntent<Draft>) {
    setRestoreFocus(true);
    startTransition(() => dispatch(intent));
  }

  async function runAction(_previous: FieldFormState<Draft | null>, intent: FieldIntent<Draft>) {
    showPending(intent);
    const response = await settleProfileAction(() => callAction(intent));
    onSettled?.();
    const next = toFieldFormState(response, intent.kind === FIELD_ACTION.save ? intent.draft : null);
    finish(next);
    return next;
  }

  const [state, dispatch, isPending] = useActionState(runAction, IDLE);
  const { error, dismiss } = useDismissibleError(state);

  return {
    mode: getFieldMode(isPending, isEditing),
    shownValue,
    pendingKind: isPending ? pendingKind : null,
    error,
    disabled: controls.disabled,
    restoreFocus,
    startEditing: () => {
      dismiss();
      setRestoreFocus(false);
      setEditing(true);
    },
    cancelEditing: () => {
      dismiss();
      setRestoreFocus(true);
      setEditing(false);
    },
    submit: (draft) => start({ kind: FIELD_ACTION.save, draft }),
    remove: () => start({ kind: FIELD_ACTION.delete }),
  };
}
