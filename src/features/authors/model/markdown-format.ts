import { FORMAT_PLACEHOLDER } from "./author-messages";
import type { FormattedText, MarkdownFormat, TextSelection } from "./author.types";

type InlineFormat = Extract<MarkdownFormat, "bold" | "italic">;
type BlockFormat = Exclude<MarkdownFormat, InlineFormat>;

const INLINE_MARKERS: Readonly<Record<InlineFormat, string>> = { bold: "**", italic: "*" };

/** Each block format's line prefix; a numbered list counts its lines from 1. */
const BLOCK_PREFIXES: Readonly<Record<BlockFormat, (lineIndex: number) => string>> = {
  heading: () => "## ",
  subheading: () => "### ",
  bulleted: () => "- ",
  numbered: (lineIndex) => `${lineIndex + 1}. `,
  quote: () => "> ",
};

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
function insertBlockPlaceholder(text: string, cursor: number, prefix: string): FormattedText {
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

/** Whether the line holding the cursor has no characters. */
function isOnEmptyLine(text: string, cursor: number): boolean {
  const atLineStart = cursor === 0 || text[cursor - 1] === "\n";
  const atLineEnd = cursor === text.length || text[cursor] === "\n";
  return atLineStart && atLineEnd;
}

/**
 * One toolbar edit: inline formats wrap the selection (or insert a placeholder word), block
 * formats prefix each selected line, or the cursor's line when nothing is selected (design D7).
 */
export function applyFormat(text: string, selection: TextSelection, format: MarkdownFormat): FormattedText {
  if (isInlineFormat(format)) return wrapInline(text, selection, INLINE_MARKERS[format]);
  const prefix = BLOCK_PREFIXES[format];
  const isEmptySelection = selection.start === selection.end;
  return isEmptySelection && isOnEmptyLine(text, selection.start)
    ? insertBlockPlaceholder(text, selection.start, prefix(0))
    : prefixLines(text, selection, prefix);
}
