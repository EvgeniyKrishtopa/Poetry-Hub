import type { AboutAlign, MarkdownFormat } from "../../model/author.types";

export interface AboutToolbarRowProps {
  readonly align: AboutAlign;
  readonly onAlignChange: (align: AboutAlign) => void;
  readonly onFormat: (format: MarkdownFormat) => void;
}
