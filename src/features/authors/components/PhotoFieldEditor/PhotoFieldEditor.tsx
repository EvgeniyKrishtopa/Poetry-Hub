"use client";

import { useId } from "react";

import { deleteProfileFieldAction, savePhotoAction } from "../../actions/author-profile.actions";
import type { PhotoDraft } from "../../hooks/profile-field.types";
import { usePhotoDraft } from "../../hooks/use-photo-draft";
import { useProfileField } from "../../hooks/use-profile-field";
import { FIELD_MODE } from "../../model/author.constants";
import { ADD_PROMPTS, FIELD_LABELS } from "../../model/author-messages";
import { AuthorPhoto } from "../AuthorPhoto/AuthorPhoto";
import { FieldActions } from "../FieldActions/FieldActions";
import { FieldErrorText } from "../FieldErrorText/FieldErrorText";
import { PhotoEditForm } from "../PhotoEditForm/PhotoEditForm";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { PhotoFieldEditorProps } from "./PhotoFieldEditor.types";

/** Photo: browser pre-check, optimistic preview, placeholder when empty (FR-8, FR-10, FR-12). */
export function PhotoFieldEditor({ photoUrl, fullName, ...controls }: PhotoFieldEditorProps) {
  const photo = usePhotoDraft();
  const errorId = useId();
  const editor = useProfileField<string, PhotoDraft>({
    savedValue: photoUrl,
    controls,
    save: ({ file }) => savePhotoAction({ photo: file }),
    remove: () => deleteProfileFieldAction({ field: "photo" }),
    toPendingValue: ({ previewUrl }) => previewUrl,
    // A file input can't be refilled, so a failed save shows the previous photo with the error (design D6).
    keepEditingOnFailure: false,
    // Set inside the action, so it commits with the settled transition: the pending preview is
    // never revoked while the optimistic photo still shows it.
    onSettled: photo.clearDraft,
  });

  function startEditing() {
    photo.reset();
    editor.startEditing();
  }

  function cancelEditing() {
    photo.reset();
    editor.cancelEditing();
  }

  // The form action, not `useActionState`'s dispatch directly: the file is checked again first, and
  // an invalid one never enters the pending state. `editor.submit` then dispatches the field's
  // `useActionState` action, the same as the other fields.
  async function submit() {
    const chosen = photo.draft;
    if (chosen === null) return;
    if (await photo.recheck(chosen)) editor.submit(chosen);
  }

  if (editor.mode === FIELD_MODE.edit) {
    return (
      <PhotoEditForm
        draft={photo.draft}
        error={photo.fileError ?? editor.error}
        fullName={fullName}
        onFileChange={photo.choose}
        onSubmit={submit}
        onCancel={cancelEditing}
      />
    );
  }

  return (
    <ProfileFieldRow caption={FIELD_LABELS.photo}>
      <AuthorPhoto photoUrl={editor.shownValue} fullName={fullName} />
      {editor.error && <FieldErrorText id={errorId} message={editor.error} />}
      <FieldActions
        hasValue={editor.shownValue !== null}
        pendingKind={editor.pendingKind}
        disabled={editor.disabled}
        addPrompt={ADD_PROMPTS.photo}
        describedBy={editor.error ? errorId : undefined}
        focusOnMount={editor.restoreFocus}
        onEdit={startEditing}
        onDelete={editor.remove}
      />
    </ProfileFieldRow>
  );
}
