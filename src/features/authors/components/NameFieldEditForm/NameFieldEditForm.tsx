import { TextField } from "@/shared/ui";

import { FIELD_LABELS } from "../../model/author-messages";
import { FieldEditActions } from "../FieldEditActions/FieldEditActions";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { NameFieldEditFormProps } from "./NameFieldEditForm.types";

/** A name field in edit mode: the labelled input, its error, and Save/Cancel (FR-6, FR-8). */
export function NameFieldEditForm({ field, draft, error, onDraftChange, onSubmit, onCancel }: NameFieldEditFormProps) {
  return (
    // noValidate: the action's schema is the only validation, so its message is what the reader sees.
    <form action={onSubmit} noValidate>
      <ProfileFieldRow
        control={
          <TextField
            layout="columns"
            label={FIELD_LABELS[field]}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            error={error}
            // The form mounts only when the reader opens the field, or a save sends them back to it (NFR-5).
            autoFocus
          />
        }
      >
        <FieldEditActions onCancel={onCancel} />
      </ProfileFieldRow>
    </form>
  );
}
