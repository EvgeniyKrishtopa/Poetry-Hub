"use client";

import { useSortable } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "@/shared/ui";

import { ADMIN_HOME_PAGE_COPY } from "../../model/admin-messages";

import type { HomeEntryRowProps } from "./HomeEntryRow.types";

const ROW_CLASSES = "flex items-center gap-2 rounded-md border px-2 py-2";
const LIFTED_CLASSES = "border-accent bg-surface";
const RESTING_CLASSES = "border-transparent";
const HANDLE_CLASSES =
  "inline-flex size-8 flex-none cursor-grab items-center justify-center rounded-full text-muted touch-manipulation hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50";
const NOT_SHOWN_PILL_CLASSES =
  "inline-flex items-center whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted";

/** One chosen entry: its drag handle (the only element that lifts it), the label, a note when hidden, and a remove button. */
export function HomeEntryRow({ entry, controlsDisabled, onRemove }: HomeEntryRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useSortable({
    id: entry.id,
    disabled: controlsDisabled,
  });
  const style: CSSProperties | undefined =
    transform === null ? undefined : { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` };

  return (
    <li ref={setNodeRef} style={style} className={`${ROW_CLASSES} ${isDragging ? LIFTED_CLASSES : RESTING_CLASSES}`}>
      <button
        type="button"
        ref={setActivatorNodeRef}
        data-handle={entry.id}
        aria-label={ADMIN_HOME_PAGE_COPY.handleLabel(entry.label)}
        disabled={controlsDisabled}
        className={HANDLE_CLASSES}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      <span className="min-w-0 flex-1 wrap-anywhere">
        <span className="block text-base">{entry.label}</span>
        {entry.authorName !== null && <span className="block text-sm text-muted">{entry.authorName}</span>}
      </span>
      {!entry.shown && <span className={NOT_SHOWN_PILL_CLASSES}>{ADMIN_HOME_PAGE_COPY.notShown}</span>}
      <Button
        variant="ghost"
        disabled={controlsDisabled}
        aria-label={ADMIN_HOME_PAGE_COPY.removeLabel(entry.label)}
        onClick={() => onRemove(entry)}
      >
        {ADMIN_HOME_PAGE_COPY.removeButton}
      </Button>
    </li>
  );
}
