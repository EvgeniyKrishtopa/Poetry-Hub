import { Button } from "@/shared/ui";

import { FIELD_ACTION_LABELS } from "../../model/author-messages";

import type { FieldEditActionsProps } from "./FieldEditActions.types";

/** A field's edit-mode buttons: Save submits the field's form, Cancel discards the draft (FR-6). */
export function FieldEditActions({ onCancel, canSave = true }: FieldEditActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={!canSave}>
        {FIELD_ACTION_LABELS.save}
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        {FIELD_ACTION_LABELS.cancel}
      </Button>
    </div>
  );
}
