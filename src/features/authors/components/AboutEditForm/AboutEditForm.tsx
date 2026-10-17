"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { FIELD_LABELS } from "../../model/author-messages";
import type { AboutAlign, MarkdownFormat } from "../../model/author.types";
import { applyFormat } from "../../model/markdown-format";
import { trimmedLength } from "../../model/trimmed-length";
import type { AboutView } from "../AboutFieldEditor/AboutFieldEditor.types";
import { AboutFieldMeta } from "../AboutFieldMeta/AboutFieldMeta";
import { AboutPreview } from "../AboutPreview/AboutPreview";
import { AboutTextarea } from "../AboutTextarea/AboutTextarea";
import { AboutToolbarRow } from "../AboutToolbarRow/AboutToolbarRow";
import { AboutViewTabs } from "../AboutViewTabs/AboutViewTabs";
import { FieldEditActions } from "../FieldEditActions/FieldEditActions";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { AboutEditFormProps } from "./AboutEditForm.types";

/** About in edit mode: the editor and preview tabs, the counter, and Save/Cancel (FR-8, FR-11). */
export function AboutEditForm({ draft, error, onDraftChange, onSubmit, onCancel }: AboutEditFormProps) {
  const [view, setView] = useState<AboutView>("editor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = useId();
  const panelId = useId();
  const errorId = useId();
  const counterId = useId();
  const describedBy = error ? `${errorId} ${counterId}` : counterId;

  function changeAlign(align: AboutAlign) {
    onDraftChange({ ...draft, align });
  }

  function handleFormat(format: MarkdownFormat) {
    const textarea = textareaRef.current;
    if (textarea === null) return;
    const result = applyFormat(draft.markdown, { start: textarea.selectionStart, end: textarea.selectionEnd }, format);
    // Committed synchronously, so the selection can be restored on the updated text right away.
    flushSync(() => onDraftChange({ ...draft, markdown: result.text }));
    textarea.focus();
    textarea.setSelectionRange(result.selection.start, result.selection.end);
  }

  return (
    <form action={onSubmit} noValidate>
      <ProfileFieldRow
        control={
          <label htmlFor={textareaId} className="text-sm font-medium min-[600px]:pt-2">
            {FIELD_LABELS.about}
          </label>
        }
      >
        <div className="flex w-full flex-col gap-3">
          <AboutViewTabs value={view} onChange={setView} panelId={panelId} />
          <div id={panelId} role="tabpanel" className="flex flex-col gap-3">
            {view === "editor" ? (
              <AboutToolbarRow align={draft.align} onAlignChange={changeAlign} onFormat={handleFormat} />
            ) : (
              <AboutPreview markdown={draft.markdown} align={draft.align} onAlignChange={changeAlign} />
            )}
            {/* Kept mounted in the preview tab, so the label still names it and the selection survives a switch. */}
            <AboutTextarea
              ref={textareaRef}
              id={textareaId}
              value={draft.markdown}
              onChange={(markdown) => onDraftChange({ ...draft, markdown })}
              hidden={view !== "editor"}
              invalid={Boolean(error)}
              describedBy={describedBy}
            />
          </div>
          <AboutFieldMeta error={error} errorId={errorId} counterId={counterId} length={trimmedLength(draft.markdown)} />
        </div>
        <FieldEditActions onCancel={onCancel} />
      </ProfileFieldRow>
    </form>
  );
}
