import type { MarkdownView } from "./MarkdownEditor.types";

export interface MarkdownViewTabsProps {
  readonly value: MarkdownView;
  readonly onChange: (view: MarkdownView) => void;
  /** The id of the panel both tabs control. */
  readonly panelId: string;
}
