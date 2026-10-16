import { useId } from "react";

import { FIELD_LABELS } from "../../model/author-messages";
import { AuthorPhoto } from "../AuthorPhoto/AuthorPhoto";
import { FieldEditActions } from "../FieldEditActions/FieldEditActions";
import { FieldErrorText } from "../FieldErrorText/FieldErrorText";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { PhotoEditFormProps } from "./PhotoEditForm.types";

const ACCEPTED_TYPES = "image/png,image/jpeg";

const FILE_INPUT_CLASS =
  "max-w-full text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-2 file:font-medium file:text-foreground";

/** The photo field in edit mode: the file input, its error, the chosen file's preview, and Save/Cancel (FR-8, FR-12). */
export function PhotoEditForm({ draft, error, fullName, onFileChange, onSubmit, onCancel }: PhotoEditFormProps) {
  const inputId = useId();
  const errorId = useId();

  return (
    <form action={onSubmit} noValidate>
      <ProfileFieldRow
        control={
          <label htmlFor={inputId} className="text-sm font-medium min-[600px]:pt-2">
            {FIELD_LABELS.photo}
          </label>
        }
      >
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={(event) => onFileChange(event.currentTarget)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={FILE_INPUT_CLASS}
        />
        {error && <FieldErrorText id={errorId} message={error} />}
        {draft !== null && <AuthorPhoto photoUrl={draft.previewUrl} fullName={fullName} />}
        <FieldEditActions onCancel={onCancel} canSave={draft !== null} />
      </ProfileFieldRow>
    </form>
  );
}
