"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { applyFormat } from "@/shared/lib/markdown/markdown-format";
import type { MarkdownFormat } from "@/shared/lib/markdown/markdown.types";

import { MarkdownText } from "../MarkdownText/MarkdownText";
import { FIELD_INPUT_CLASS } from "../TextField/text-field-classes";
import { formatCharacterCounter } from "../ui-messages";

import type { MarkdownEditorProps, MarkdownView } from "./MarkdownEditor.types";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { MarkdownViewTabs } from "./MarkdownViewTabs";

const TEXTAREA_CLASS = `${FIELD_INPUT_CLASS} min-h-64 w-full resize-y`;

/**
 * A Markdown field: the editor / preview tabs, the toolbar, the source textarea, and under it the
 * field error and the character counter (add-author-profiles FR-8, FR-11; add-poem-creation design D6).
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  error,
  length,
  maxLength,
  formats,
  variant,
  autoFocus = false,
}: MarkdownEditorProps) {
  const [view, setView] = useState<MarkdownView>("editor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelId = useId();
  const errorId = useId();
  const counterId = useId();
  const describedBy = error ? `${errorId} ${counterId}` : counterId;
  const counterTone = length > maxLength ? "font-medium text-danger" : "text-muted";

  function handleFormat(format: MarkdownFormat) {
    const textarea = textareaRef.current;
    if (textarea === null) return;
    const result = applyFormat(value, { start: textarea.selectionStart, end: textarea.selectionEnd }, format);
    // Committed synchronously, so the selection can be restored on the updated text right away.
    flushSync(() => onChange(result.text));
    textarea.focus();
    textarea.setSelectionRange(result.selection.start, result.selection.end);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <MarkdownViewTabs value={view} onChange={setView} panelId={panelId} />
      <div id={panelId} role="tabpanel" className="flex flex-col gap-3">
        {view === "editor" ? (
          <MarkdownToolbar formats={formats} onFormat={handleFormat} />
        ) : (
          <div className="min-h-64 rounded-md border border-border p-4">
            <MarkdownText markdown={value} variant={variant} />
          </div>
        )}
        {/* Kept mounted in the preview tab, so the label still names it and the selection survives a switch. */}
        <textarea
          ref={textareaRef}
          id={id}
          hidden={view !== "editor"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoFocus={autoFocus}
          className={TEXTAREA_CLASS}
        />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        {error && (
          <p id={errorId} className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <p id={counterId} className={`ml-auto text-sm tabular-nums ${counterTone}`}>
          {formatCharacterCounter(length, maxLength)}
        </p>
      </div>
    </div>
  );
}
