"use client";

import { useId, useState } from "react";

import { Button, TextField } from "@/shared/ui";

import { deleteProfileFieldAction, saveNameAction } from "../../actions/author-profile.actions";
import { ADD_PROMPTS, FIELD_ACTION_LABELS, FIELD_LABELS } from "../../model/author-messages";
import { useProfileField } from "../AuthorProfileEditor/use-profile-field";
import { FieldActions } from "../FieldActions/FieldActions";
import { FieldErrorText } from "../FieldErrorText/FieldErrorText";
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

  if (editor.mode === "edit") {
    return (
      // noValidate: the action's schema is the only validation, so its message is what the reader sees.
      <form action={() => editor.submit(draft)} noValidate>
        <ProfileFieldRow
          control={
            <TextField
              layout="columns"
              label={FIELD_LABELS[field]}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              error={editor.error}
            />
          }
        >
          <div className="flex flex-wrap gap-2">
            <Button type="submit">{FIELD_ACTION_LABELS.save}</Button>
            <Button variant="ghost" onClick={editor.cancelEditing}>
              {FIELD_ACTION_LABELS.cancel}
            </Button>
          </div>
        </ProfileFieldRow>
      </form>
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
