import { INDENT_STEP, SEPARATOR_LINE } from "./markdown.constants";
import { FORMAT_PLACEHOLDER } from "./markdown-messages";
import type { FormattedText, MarkdownFormat, TextSelection } from "./markdown.types";

type InlineFormat = Extract<MarkdownFormat, "bold" | "italic">;
type LinePrefixFormat = Exclude<MarkdownFormat, InlineFormat | "separator" | "indent">;

const INLINE_MARKERS: Readonly<Record<InlineFormat, string>> = { bold: "**", italic: "*" };

/** Each line-prefix format's prefix; a numbered list counts its lines from 1. */
const LINE_PREFIXES: Readonly<Record<LinePrefixFormat, (lineIndex: number) => string>> = {
  heading: () => "## ",
  subheading: () => "### ",
  bulleted: () => "- ",
  numbered: (lineIndex) => `${lineIndex + 1}. `,
  quote: () => "> ",
  // The poem's epigraph is a blockquote, styled as one by `MarkdownText variant="poem"`.
  epigraph: () => "> ",
};

/** The separator with the one blank line it keeps on each side. */
const SEPARATOR_BLOCK = `\n\n${SEPARATOR_LINE}\n\n`;

function isInlineFormat(format: MarkdownFormat): format is InlineFormat {
  return format in INLINE_MARKERS;
}

/**
 * The selection without whitespace at its edges: CommonMark doesn't render `** word**` as bold, so
 * the markers go around the word and the spaces stay outside. All whitespace → empty, at its end.
 */
function trimSelection(text: string, { start, end }: TextSelection): TextSelection {
  const selectedText = text.slice(start, end);
  const trimmedStart = start + (selectedText.length - selectedText.trimStart().length);
  const trimmedEnd = end - (selectedText.length - selectedText.trimEnd().length);
  return trimmedStart < trimmedEnd ? { start: trimmedStart, end: trimmedEnd } : { start: end, end };
}

/** Wraps the selection, or a selected placeholder when it is empty; the inner text stays selected. */
function wrapInline(text: string, selection: TextSelection, marker: string): FormattedText {
  const { start, end } = trimSelection(text, selection);
  const inner = start === end ? FORMAT_PLACEHOLDER : text.slice(start, end);
  const innerStart = start + marker.length;
  return {
    text: `${text.slice(0, start)}${marker}${inner}${marker}${text.slice(end)}`,
    selection: { start: innerStart, end: innerStart + inner.length },
  };
}

/** Fills the empty line at the cursor with a prefixed, selected placeholder. */
function insertLinePlaceholder(text: string, cursor: number, prefix: string): FormattedText {
  const placeholderStart = cursor + prefix.length;
  return {
    text: `${text.slice(0, cursor)}${prefix}${FORMAT_PLACEHOLDER}${text.slice(cursor)}`,
    selection: { start: placeholderStart, end: placeholderStart + FORMAT_PLACEHOLDER.length },
  };
}

/** Prefixes every line the selection touches; the whole formatted block ends up selected. */
function prefixLines(text: string, { start, end }: TextSelection, prefix: (lineIndex: number) => string): FormattedText {
  // A selection ending right after a line break doesn't reach into the next line.
  const lastIndex = end > start && text[end - 1] === "\n" ? end - 1 : end;
  // At 0, `lastIndexOf("\n", -1)` would still inspect index 0.
  const blockStart = start === 0 ? 0 : text.lastIndexOf("\n", start - 1) + 1;
  const lineBreak = text.indexOf("\n", lastIndex);
  const blockEnd = lineBreak === -1 ? text.length : lineBreak;
  const block = text
    .slice(blockStart, blockEnd)
    .split("\n")
    .map((line, index) => `${prefix(index)}${line}`)
    .join("\n");
  return {
    text: `${text.slice(0, blockStart)}${block}${text.slice(blockEnd)}`,
    selection: { start: blockStart, end: blockStart + block.length },
  };
}

/**
 * Replaces the selection with the separator, dropping the blank lines already around it so the
 * stanza break stays one empty line on each side; the cursor lands after it. Only whole blank lines
 * are dropped: the next stanza's first line keeps its indent.
 */
function insertSeparator(text: string, { start, end }: TextSelection): FormattedText {
  const before = text.slice(0, start).replace(/(?:\n[ \t]*)*$/, "");
  const after = text.slice(end).replace(/^(?:[ \t]*\n)*/, "");
  const inserted = before === "" ? SEPARATOR_BLOCK.trimStart() : SEPARATOR_BLOCK;
  const cursor = before.length + inserted.length;
  return { text: `${before}${inserted}${after}`, selection: { start: cursor, end: cursor } };
}

/** Whether the line holding the cursor has no characters. */
function isOnEmptyLine(text: string, cursor: number): boolean {
  const atLineStart = cursor === 0 || text[cursor - 1] === "\n";
  const atLineEnd = cursor === text.length || text[cursor] === "\n";
  return atLineStart && atLineEnd;
}

/**
 * One toolbar edit: inline formats wrap the selection (or insert a placeholder word), line-prefix
 * formats prefix each selected line, or the cursor's line when nothing is selected
 * (add-author-profiles design D7). `indent` prefixes the lines even when empty, and `separator`
 * replaces the selection (add-poem-creation design D6).
 */
export function applyFormat(text: string, selection: TextSelection, format: MarkdownFormat): FormattedText {
  if (isInlineFormat(format)) return wrapInline(text, selection, INLINE_MARKERS[format]);
  if (format === "separator") return insertSeparator(text, selection);
  if (format === "indent") return prefixLines(text, selection, () => INDENT_STEP);
  const prefix = LINE_PREFIXES[format];
  const isEmptySelection = selection.start === selection.end;
  return isEmptySelection && isOnEmptyLine(text, selection.start)
    ? insertLinePlaceholder(text, selection.start, prefix(0))
    : prefixLines(text, selection, prefix);
}
