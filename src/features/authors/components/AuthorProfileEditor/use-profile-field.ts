"use client";

import { startTransition, useActionState, useOptimistic, useState } from "react";

import type { FieldFormState, ProfileActionResponse } from "../../model/author.types";
import { getFieldErrorMessage, toFieldFormState } from "../../model/profile-form-state";

import type { FieldEditorControls } from "./AuthorProfileEditor.types";
import { settleProfileAction } from "./settle-profile-action";

type FieldIntent<Draft> = { readonly kind: "save"; readonly draft: Draft } | { readonly kind: "delete" };

export type FieldPendingKind = FieldIntent<unknown>["kind"];

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
  /** Runs once the action has settled, before the transition commits (the photo revokes its preview URL). */
  readonly onSettled?: () => void;
}

export interface ProfileField<Value, Draft> {
  readonly mode: "view" | "edit";
  readonly shownValue: Value | null;
  /** Which action is pending, or `null` when none is. */
  readonly pendingKind: FieldPendingKind | null;
  readonly error: string | undefined;
  readonly disabled: boolean;
  readonly startEditing: () => void;
  readonly cancelEditing: () => void;
  readonly submit: (draft: Draft) => void;
  readonly remove: () => void;
}

const IDLE: FieldFormState<never> = { status: "idle" };

/**
 * One field's edit mode, optimistic value, and action wrapper (design D6): the field leaves edit mode
 * as soon as an action starts, shows the submitted value (or the empty state for a delete) while it
 * is pending, and falls back to the props when the transition settles.
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
  // The form state whose error the reader dismissed (Cancel, or Edit after a failed delete).
  const [dismissedState, setDismissedState] = useState<FieldFormState<Draft | null> | null>(null);
  const [shownValue, setShownValue] = useOptimistic(savedValue);
  const [pendingKind, setPendingKind] = useOptimistic<FieldPendingKind | null>(null);

  async function runAction(_previous: FieldFormState<Draft | null>, intent: FieldIntent<Draft>): Promise<FieldFormState<Draft | null>> {
    controls.onActionStart();
    setPendingKind(intent.kind);
    setShownValue(intent.kind === "save" ? toPendingValue(intent.draft) : null);

    const response = await settleProfileAction(() => (intent.kind === "save" ? save(intent.draft) : remove()));
    onSettled?.();
    const next = toFieldFormState(response, intent.kind === "save" ? intent.draft : null);

    if (next.status === "saved") {
      setIsEditing(false);
      controls.onEditEnd();
      controls.onSaved();
    } else {
      if (!keepEditingOnFailure) {
        setIsEditing(false);
        controls.onEditEnd();
      }
      controls.onFailed();
    }
    return next;
  }

  const [state, dispatch, isPending] = useActionState(runAction, IDLE);

  function startEditing() {
    setDismissedState(state);
    setIsEditing(true);
    controls.onEditStart();
  }

  function cancelEditing() {
    setDismissedState(state);
    setIsEditing(false);
    controls.onEditEnd();
  }

  return {
    // A pending action always shows view mode: the submitted value, or the empty state (FR-7, FR-10).
    mode: !isPending && isEditing ? "edit" : "view",
    shownValue,
    pendingKind: isPending ? pendingKind : null,
    error: state === dismissedState ? undefined : getFieldErrorMessage(state),
    disabled: controls.disabled,
    startEditing,
    cancelEditing,
    submit: (draft) => startTransition(() => dispatch({ kind: "save", draft })),
    remove: () => startTransition(() => dispatch({ kind: "delete" })),
  };
}
