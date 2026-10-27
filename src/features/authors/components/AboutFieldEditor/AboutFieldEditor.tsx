"use client";

import { useId, useState } from "react";

import { deleteProfileFieldAction, saveAboutAction } from "../../actions/author-profile.actions";
import { useProfileField } from "../../hooks/use-profile-field";
import { FIELD_MODE } from "../../model/author.constants";
import { ADD_PROMPTS, FIELD_LABELS } from "../../model/author-messages";
import { AboutEditForm } from "../AboutEditForm/AboutEditForm";
import { AuthorAbout } from "../AuthorAbout/AuthorAbout";
import { FieldActions } from "../FieldActions/FieldActions";
import { FieldErrorText } from "../FieldErrorText/FieldErrorText";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { AboutFieldEditorProps } from "./AboutFieldEditor.types";

/** About: its rendered value, and the Markdown editor in edit mode (FR-6, FR-10, FR-11). */
export function AboutFieldEditor({ savedAbout, ...controls }: AboutFieldEditorProps) {
  const [draft, setDraft] = useState("");
  const errorId = useId();
  const editor = useProfileField<string, string>({
    savedValue: savedAbout,
    controls,
    save: (about) => saveAboutAction({ about }),
    remove: () => deleteProfileFieldAction({ field: "about" }),
    toPendingValue: (about) => about,
    keepEditingOnFailure: true,
  });

  function startEditing() {
    setDraft(savedAbout ?? "");
    editor.startEditing();
  }

  if (editor.mode === FIELD_MODE.edit) {
    return (
      <AboutEditForm
        draft={draft}
        error={editor.error}
        onDraftChange={setDraft}
        onSubmit={() => editor.submit(draft)}
        onCancel={editor.cancelEditing}
      />
    );
  }

  return (
    <ProfileFieldRow caption={FIELD_LABELS.about}>
      {editor.shownValue !== null && (
        <div className="w-full pt-1.5">
          <AuthorAbout markdown={editor.shownValue} />
        </div>
      )}
      {editor.error && <FieldErrorText id={errorId} message={editor.error} />}
      <FieldActions
        hasValue={editor.shownValue !== null}
        pendingKind={editor.pendingKind}
        disabled={editor.disabled}
        addPrompt={ADD_PROMPTS.about}
        describedBy={editor.error ? errorId : undefined}
        focusOnMount={editor.restoreFocus}
        onEdit={startEditing}
        onDelete={editor.remove}
      />
    </ProfileFieldRow>
  );
}
