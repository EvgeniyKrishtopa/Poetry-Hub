"use client";

import { useId, useState } from "react";

import { deleteProfileFieldAction, saveNameAction } from "../../actions/author-profile.actions";
import { FIELD_MODE } from "../../model/author.constants";
import { ADD_PROMPTS, FIELD_LABELS } from "../../model/author-messages";
import { useProfileField } from "../AuthorProfileEditor/use-profile-field";
import { FieldActions } from "../FieldActions/FieldActions";
import { FieldErrorText } from "../FieldErrorText/FieldErrorText";
import { NameFieldEditForm } from "../NameFieldEditForm/NameFieldEditForm";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { NameFieldEditorProps } from "./NameFieldEditor.types";

/** First or last name: view, edit, pending, and error states (FR-6, FR-7, FR-10). */
export function NameFieldEditor({ field, savedValue, ...controls }: NameFieldEditorProps) {
  const [draft, setDraft] = useState("");
  const errorId = useId();
  const editor = useProfileField<string, string>({
    savedValue,
    controls,
    save: (value) => saveNameAction({ field, value }),
    remove: () => deleteProfileFieldAction({ field }),
    toPendingValue: (value) => value,
    keepEditingOnFailure: true,
  });

  function startEditing() {
    setDraft(savedValue ?? "");
    editor.startEditing();
  }

  if (editor.mode === FIELD_MODE.edit) {
    return (
      <NameFieldEditForm
        field={field}
        draft={draft}
        error={editor.error}
        onDraftChange={setDraft}
        onSubmit={() => editor.submit(draft)}
        onCancel={editor.cancelEditing}
      />
    );
  }

  return (
    <ProfileFieldRow caption={FIELD_LABELS[field]}>
      {editor.shownValue && <p className="pt-1.5 break-words">{editor.shownValue}</p>}
      {editor.error && <FieldErrorText id={errorId} message={editor.error} />}
      <FieldActions
        hasValue={Boolean(editor.shownValue)}
        pendingKind={editor.pendingKind}
        disabled={editor.disabled}
        addPrompt={ADD_PROMPTS[field]}
        describedBy={editor.error ? errorId : undefined}
        onEdit={startEditing}
        onDelete={editor.remove}
      />
    </ProfileFieldRow>
  );
}
