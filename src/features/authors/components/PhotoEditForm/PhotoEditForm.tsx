import { useId } from "react";

import { FIELD_LABELS } from "../../model/author-messages";
import { AuthorPhoto } from "../AuthorPhoto/AuthorPhoto";
import { FieldEditActions } from "../FieldEditActions/FieldEditActions";
import { FieldErrorText } from "../FieldErrorText/FieldErrorText";
import { PhotoPicker } from "../PhotoPicker/PhotoPicker";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { PhotoEditFormProps } from "./PhotoEditForm.types";

/** The photo field in edit mode: the file picker, its error, the chosen file's preview, and Save/Cancel (FR-8, FR-12). */
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
        <PhotoPicker
          id={inputId}
          fileName={draft?.file.name ?? null}
          errorId={error ? errorId : undefined}
          onFileChange={onFileChange}
        />
        {error && <FieldErrorText id={errorId} message={error} />}
        {draft !== null && <AuthorPhoto photoUrl={draft.previewUrl} fullName={fullName} />}
        <FieldEditActions onCancel={onCancel} canSave={draft !== null} />
      </ProfileFieldRow>
    </form>
  );
}
