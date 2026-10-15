import type { FormattedText, MarkdownFormat, TextSelection } from "./author.types";

/**
 * One toolbar edit: inline formats wrap the selection (or insert a placeholder word), block
 * formats prefix each selected line (design D7).
 */
export function applyFormat(text: string, selection: TextSelection, format: MarkdownFormat): FormattedText {
  void text;
  void selection;
  void format;
  throw new Error("not implemented");
}
