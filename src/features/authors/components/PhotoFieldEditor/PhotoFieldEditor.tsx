"use client";

import { type ChangeEvent, useId, useState } from "react";

import { Button } from "@/shared/ui";

import { deleteProfileFieldAction, savePhotoAction } from "../../actions/author-profile.actions";
import { ADD_PROMPTS, FIELD_ACTION_LABELS, FIELD_LABELS, PHOTO_FILE_ERROR_MESSAGES } from "../../model/author-messages";
import { validatePhotoFile } from "../../model/validate-photo-file";
import { useProfileField } from "../AuthorProfileEditor/use-profile-field";
import { AuthorPhoto } from "../AuthorPhoto/AuthorPhoto";
import { FieldActions } from "../FieldActions/FieldActions";
import { FieldErrorText } from "../FieldErrorText/FieldErrorText";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { PhotoDraft, PhotoFieldEditorProps } from "./PhotoFieldEditor.types";

const ACCEPTED_TYPES = "image/png,image/jpeg";

/** Photo: browser pre-check, optimistic preview, placeholder when empty (FR-8, FR-10, FR-12). */
export function PhotoFieldEditor({ photoUrl, fullName, ...controls }: PhotoFieldEditorProps) {
  const [draft, setDraft] = useState<PhotoDraft | null>(null);
  // The browser check's error: shown with no request sent (FR-8).
  const [fileError, setFileError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  const editor = useProfileField<string, PhotoDraft>({
    savedValue: photoUrl,
    controls,
    save: ({ file }) => savePhotoAction({ photo: file }),
    remove: () => deleteProfileFieldAction({ field: "photo" }),
    toPendingValue: ({ previewUrl }) => previewUrl,
    // A file input can't be refilled, so a failed save shows the previous photo with the error (design D6).
    keepEditingOnFailure: false,
    onSettled: () => replaceDraft(null),
  });

  function replaceDraft(next: PhotoDraft | null) {
    if (draft !== null) URL.revokeObjectURL(draft.previewUrl);
    setDraft(next);
  }

  function startEditing() {
    replaceDraft(null);
    setFileError(null);
    editor.startEditing();
  }

  function cancelEditing() {
    replaceDraft(null);
    setFileError(null);
    editor.cancelEditing();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    const check = await validatePhotoFile(file);
    if (!check.ok) {
      replaceDraft(null);
      setFileError(PHOTO_FILE_ERROR_MESSAGES[check.error]);
      return;
    }
    setFileError(null);
    replaceDraft({ file, previewUrl: URL.createObjectURL(file) });
  }

  async function submit() {
    if (draft === null) return;
    // Checked again right before sending: nothing invalid ever leaves the browser (FR-8).
    const check = await validatePhotoFile(draft.file);
    if (!check.ok) {
      setFileError(PHOTO_FILE_ERROR_MESSAGES[check.error]);
      return;
    }
    editor.submit(draft);
  }

  if (editor.mode === "edit") {
    const error = fileError ?? editor.error;

    return (
      <form action={submit} noValidate>
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
            onChange={handleFileChange}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="max-w-full text-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-2 file:font-medium file:text-foreground"
          />
          {error && <FieldErrorText id={errorId} message={error} />}
          {draft !== null && <AuthorPhoto photoUrl={draft.previewUrl} fullName={fullName} />}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={draft === null}>
              {FIELD_ACTION_LABELS.save}
            </Button>
            <Button variant="ghost" onClick={cancelEditing}>
              {FIELD_ACTION_LABELS.cancel}
            </Button>
          </div>
        </ProfileFieldRow>
      </form>
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
        onEdit={startEditing}
        onDelete={editor.remove}
      />
    </ProfileFieldRow>
  );
}
