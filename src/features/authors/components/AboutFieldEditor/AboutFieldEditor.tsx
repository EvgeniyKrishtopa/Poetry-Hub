"use client";

import { useId, useState } from "react";

import { deleteProfileFieldAction, saveAboutAction } from "../../actions/author-profile.actions";
import { FIELD_MODE } from "../../model/author.constants";
import { ADD_PROMPTS, FIELD_LABELS } from "../../model/author-messages";
import { AboutEditForm } from "../AboutEditForm/AboutEditForm";
import { useProfileField } from "../AuthorProfileEditor/use-profile-field";
import { AuthorAbout } from "../AuthorAbout/AuthorAbout";
import { FieldActions } from "../FieldActions/FieldActions";
import { FieldErrorText } from "../FieldErrorText/FieldErrorText";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { AboutContent, AboutFieldEditorProps } from "./AboutFieldEditor.types";

const EMPTY_DRAFT: AboutContent = { markdown: "", align: "left" };

/** About: its rendered value, and the Markdown editor in edit mode (FR-6, FR-10, FR-11). */
export function AboutFieldEditor({ savedAbout, savedAlign, ...controls }: AboutFieldEditorProps) {
  const savedContent: AboutContent | null = savedAbout === null ? null : { markdown: savedAbout, align: savedAlign };
  const [draft, setDraft] = useState<AboutContent>(EMPTY_DRAFT);
  const errorId = useId();
  const editor = useProfileField<AboutContent, AboutContent>({
    savedValue: savedContent,
    controls,
    save: ({ markdown, align }) => saveAboutAction({ about: markdown, align }),
    remove: () => deleteProfileFieldAction({ field: "about" }),
    toPendingValue: (content) => content,
    keepEditingOnFailure: true,
  });

  function startEditing() {
    // With no saved about, the draft starts left-aligned: a delete resets the alignment (FR-10).
    setDraft(savedContent ?? EMPTY_DRAFT);
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
      {editor.shownValue && (
        <div className="w-full pt-1.5">
          <AuthorAbout markdown={editor.shownValue.markdown} align={editor.shownValue.align} />
        </div>
      )}
      {editor.error && <FieldErrorText id={errorId} message={editor.error} />}
      <FieldActions
        hasValue={editor.shownValue !== null}
        pendingKind={editor.pendingKind}
        disabled={editor.disabled}
        addPrompt={ADD_PROMPTS.about}
        describedBy={editor.error ? errorId : undefined}
        onEdit={startEditing}
        onDelete={editor.remove}
      />
    </ProfileFieldRow>
  );
}
