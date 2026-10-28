import type { MarkdownFormat } from "@/shared/lib/markdown/markdown.types";

export interface MarkdownToolbarProps {
  /** The buttons to show, in order. */
  readonly formats: readonly MarkdownFormat[];
  readonly onFormat: (format: MarkdownFormat) => void;
}
