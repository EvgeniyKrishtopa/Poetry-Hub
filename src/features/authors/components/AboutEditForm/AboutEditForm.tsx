"use client";

import { useId } from "react";

import { trimmedLength } from "@/shared/lib/text/trimmed-length";
import { MarkdownEditor } from "@/shared/ui";

import { ABOUT_MARKDOWN_FORMATS, ABOUT_MAX_LENGTH } from "../../model/author.constants";
import { FIELD_LABELS } from "../../model/author-messages";
import { FieldEditActions } from "../FieldEditActions/FieldEditActions";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { AboutEditFormProps } from "./AboutEditForm.types";

/** About in edit mode: the Markdown editor with about's label and limit, and Save/Cancel (FR-8, FR-11). */
export function AboutEditForm({ draft, error, onDraftChange, onSubmit, onCancel }: AboutEditFormProps) {
  const textareaId = useId();

  return (
    <form action={onSubmit} noValidate>
      <ProfileFieldRow
        control={
          <label htmlFor={textareaId} className="text-sm font-medium min-[600px]:pt-2">
            {FIELD_LABELS.about}
          </label>
        }
      >
        <MarkdownEditor
          id={textareaId}
          value={draft}
          onChange={onDraftChange}
          error={error}
          length={trimmedLength(draft)}
          maxLength={ABOUT_MAX_LENGTH}
          formats={ABOUT_MARKDOWN_FORMATS}
          variant="about"
          // It mounts only with about's edit form: when the reader opens the field, or a save sends them back (NFR-5).
          autoFocus
        />
        <FieldEditActions onCancel={onCancel} />
      </ProfileFieldRow>
    </form>
  );
}
