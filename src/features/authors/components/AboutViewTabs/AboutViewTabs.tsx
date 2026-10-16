import type { KeyboardEvent } from "react";

import { ABOUT_VIEW_LABELS } from "../../model/author-messages";
import type { AboutView } from "../AboutFieldEditor/AboutFieldEditor.types";

import type { AboutViewTabsProps } from "./AboutViewTabs.types";

const VIEWS: readonly AboutView[] = ["editor", "preview"];

/**
 * The about editor's Editor / Preview switch (FR-11), as an ARIA tab list: only the selected tab is in the tab order,
 * and the arrow keys move between the two (the WAI-ARIA tabs pattern, NFR-5).
 */
export function AboutViewTabs({ value, onChange, panelId }: AboutViewTabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = value === "editor" ? "preview" : "editor";
    onChange(next);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-view="${next}"]`)?.focus();
  }

  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      {VIEWS.map((view) => (
        <button
          key={view}
          type="button"
          role="tab"
          data-view={view}
          aria-selected={view === value}
          aria-controls={panelId}
          tabIndex={view === value ? 0 : -1}
          onClick={() => onChange(view)}
          onKeyDown={handleKeyDown}
          className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted aria-selected:border-accent aria-selected:text-foreground"
        >
          {ABOUT_VIEW_LABELS[view]}
        </button>
      ))}
    </div>
  );
}
