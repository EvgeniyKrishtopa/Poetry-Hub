"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/shared/ui";

import { deleteProfileFieldAction, saveAboutAction } from "../../actions/author-profile.actions";
import { ABOUT_MAX_LENGTH } from "../../model/author.constants";
import { ADD_PROMPTS, FIELD_ACTION_LABELS, FIELD_LABELS, formatAboutCounter } from "../../model/author-messages";
import type { MarkdownFormat } from "../../model/author.types";
import { applyFormat } from "../../model/markdown-format";
import { trimmedLength } from "../../model/trimmed-length";
import { AboutViewTabs } from "../AboutViewTabs/AboutViewTabs";
import { AlignControl } from "../AlignControl/AlignControl";
import { useProfileField } from "../AuthorProfileEditor/use-profile-field";
import { AuthorAbout } from "../AuthorAbout/AuthorAbout";
import { FieldActions } from "../FieldActions/FieldActions";
import { FieldErrorText } from "../FieldErrorText/FieldErrorText";
import { MarkdownToolbar } from "../MarkdownToolbar/MarkdownToolbar";
import { ProfileFieldRow } from "../ProfileFieldRow/ProfileFieldRow";

import type { AboutContent, AboutFieldEditorProps, AboutView } from "./AboutFieldEditor.types";

// TextField's input classes, so the textarea matches the name inputs.
const TEXTAREA_CLASS =
  "min-h-64 w-full resize-y rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-accent aria-invalid:border-danger aria-invalid:focus:border-danger";

const EMPTY_DRAFT: AboutContent = { markdown: "", align: "left" };

/** About: toolbar, alignment, «Редактор»/«Просмотр», and the counter (FR-10, FR-11). */
export function AboutFieldEditor({ savedAbout, savedAlign, ...controls }: AboutFieldEditorProps) {
  const [draft, setDraft] = useState<AboutContent>(EMPTY_DRAFT);
  const [view, setView] = useState<AboutView>("editor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = useId();
  const panelId = useId();
  const errorId = useId();
  const counterId = useId();
  const editor = useProfileField<AboutContent, AboutContent>({
    savedValue: savedAbout === null ? null : { markdown: savedAbout, align: savedAlign },
    controls,
    save: ({ markdown, align }) => saveAboutAction({ about: markdown, align }),
    remove: () => deleteProfileFieldAction({ field: "about" }),
    toPendingValue: (content) => content,
    keepEditingOnFailure: true,
  });

  function startEditing() {
    // A deleted about has its alignment reset to left (FR-10), whatever the props still say.
    setDraft(savedAbout === null ? EMPTY_DRAFT : { markdown: savedAbout, align: savedAlign });
    setView("editor");
    editor.startEditing();
  }

  function handleFormat(format: MarkdownFormat) {
    const textarea = textareaRef.current;
    if (textarea === null) return;
    const result = applyFormat(draft.markdown, { start: textarea.selectionStart, end: textarea.selectionEnd }, format);
    // Committed synchronously, so the selection can be restored on the updated text right away.
    flushSync(() => setDraft({ ...draft, markdown: result.text }));
    textarea.focus();
    textarea.setSelectionRange(result.selection.start, result.selection.end);
  }

  if (editor.mode === "edit") {
    const length = trimmedLength(draft.markdown);
    const isOverLimit = length > ABOUT_MAX_LENGTH;
    const describedBy = editor.error ? `${errorId} ${counterId}` : counterId;

    return (
      <form action={() => editor.submit(draft)} noValidate>
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
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <MarkdownToolbar onFormat={handleFormat} />
                  <AlignControl value={draft.align} onChange={(align) => setDraft({ ...draft, align })} />
                </div>
              ) : (
                <>
                  <AlignControl value={draft.align} onChange={(align) => setDraft({ ...draft, align })} />
                  <div className="min-h-64 rounded-md border border-border p-4">
                    <AuthorAbout markdown={draft.markdown} align={draft.align} />
                  </div>
                </>
              )}
              {/* Kept mounted in «Просмотр», so the label still names it and the selection survives a switch. */}
              <textarea
                ref={textareaRef}
                id={textareaId}
                hidden={view !== "editor"}
                value={draft.markdown}
                onChange={(event) => setDraft({ ...draft, markdown: event.target.value })}
                aria-invalid={editor.error ? true : undefined}
                aria-describedby={describedBy}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              {editor.error && <FieldErrorText id={errorId} message={editor.error} />}
              <p
                id={counterId}
                className={`ml-auto text-sm tabular-nums ${isOverLimit ? "font-medium text-danger" : "text-muted"}`}
              >
                {formatAboutCounter(length)}
              </p>
            </div>
          </div>
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
