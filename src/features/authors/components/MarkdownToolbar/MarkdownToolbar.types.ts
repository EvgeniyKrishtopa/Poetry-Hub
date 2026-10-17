import type { MarkdownFormat } from "../../model/author.types";

export interface MarkdownToolbarProps {
  readonly onFormat: (format: MarkdownFormat) => void;
}
