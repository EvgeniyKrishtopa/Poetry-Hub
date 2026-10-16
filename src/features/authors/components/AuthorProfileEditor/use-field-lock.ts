"use client";

import { useOptimistic, useState } from "react";

import type { ProfileField } from "../../model/author.types";

/**
 * The one-active-field rule (FR-6, FR-7): a field being edited, or one with a pending action,
 * locks every other field.
 */
export function useFieldLock() {
  // Edit starts outside any transition, so plain state shows at once. A pending action's field must
  // be optimistic: plain state set inside the action would only commit once it has settled (design D6).
  const [editingField, setEditingField] = useState<ProfileField | null>(null);
  const [activeField, setActiveField] = useOptimistic<ProfileField | null>(null);
  const lockingField = editingField ?? activeField;

  return {
    isLockedFor: (field: ProfileField) => lockingField !== null && lockingField !== field,
    setEditing: (field: ProfileField, isEditing: boolean) => setEditingField(isEditing ? field : null),
    /** Call inside the field's action: the lock lasts exactly as long as the action is pending. */
    markActive: (field: ProfileField) => setActiveField(field),
  };
}
