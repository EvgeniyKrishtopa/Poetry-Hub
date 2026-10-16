import { Button } from "@/shared/ui";

import { FIELD_ACTION } from "../../model/author.constants";
import { FIELD_ACTION_LABELS } from "../../model/author-messages";

import type { FieldActionsProps } from "./FieldActions.types";

// Ghost buttons sit flush with the value text: their own 1rem padding is pulled back.
const VIEW_ACTIONS_CLASS = "-ml-4 flex flex-wrap gap-2";

/**
 * A field's view-mode buttons: one disabled saving or deleting button while its action is pending,
 * else Edit and Delete for a value, or the add prompt for an empty field (FR-6, FR-7, FR-10).
 */
export function FieldActions({ hasValue, pendingKind, disabled, addPrompt, describedBy, onEdit, onDelete }: FieldActionsProps) {
  if (pendingKind === FIELD_ACTION.save) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button disabled>{FIELD_ACTION_LABELS.saving}</Button>
      </div>
    );
  }
  if (pendingKind === FIELD_ACTION.delete) {
    return (
      <div className={VIEW_ACTIONS_CLASS}>
        <Button variant="ghost" disabled>
          {FIELD_ACTION_LABELS.deleting}
        </Button>
      </div>
    );
  }
  if (!hasValue) {
    return (
      <div className={VIEW_ACTIONS_CLASS}>
        <Button variant="ghost" disabled={disabled} aria-describedby={describedBy} onClick={onEdit}>
          {addPrompt}
        </Button>
      </div>
    );
  }
  return (
    <div className={VIEW_ACTIONS_CLASS}>
      <Button variant="ghost" disabled={disabled} aria-describedby={describedBy} onClick={onEdit}>
        {FIELD_ACTION_LABELS.edit}
      </Button>
      <Button variant="ghost" disabled={disabled} aria-describedby={describedBy} onClick={onDelete}>
        {FIELD_ACTION_LABELS.delete}
      </Button>
    </div>
  );
}
