import "server-only";

const ELLIPSIS = "…";

/** A line of only three or more `*`, `-` or `_` (the poem separator `* * *` among them). */
const THEMATIC_BREAK = /^\s*([-*_])(?:\s*\1){2,}\s*$/;

/**
 * What opens a line in the formats the editors produce: quote and epigraph `>`, heading `#`, bullet and
 * numbered list markers. `\s` includes the em space of the indent format, so an indented line is covered.
 */
const BLOCK_MARKER = /^\s*(?:(?:>\s*)+|#{1,6}\s+|(?:[-+*]|\d+[.)])\s+)/;

/** The bold and italic markers; a `*` that opens a bullet is already gone by then. */
const EMPHASIS_MARKERS = /\*+/g;

const WHITESPACE_RUN = /\s+/g;

function toPlainLine(line: string): string {
  if (THEMATIC_BREAK.test(line)) return "";
  const withoutBlockMarker = line.replace(BLOCK_MARKER, "");
  return withoutBlockMarker.replace(EMPHASIS_MARKERS, "");
}

/** At most `limit` characters including the closing «…»: cut at the last space, or hard when there is none. */
function shortenAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const room = limit - ELLIPSIS.length;
  const head = text.slice(0, room);
  const endsAtWordBoundary = text[room] === " ";
  const lastSpace = head.lastIndexOf(" ");
  const cut = endsAtWordBoundary || lastSpace === -1 ? head : head.slice(0, lastSpace);
  return `${cut}${ELLIPSIS}`;
}

/**
 * Markdown to a plain-text excerpt (NFR-4): syntax removed, whitespace collapsed, at most `limit`
 * characters, cut at a word boundary with `…` (hard cut when there is no space). Empty when nothing is left.
 */
export function toPlainTextExcerpt(markdown: string, limit: number): string {
  const plainLines = markdown.split("\n").map(toPlainLine);
  const text = plainLines.join(" ").replace(WHITESPACE_RUN, " ").trim();
  return shortenAtWord(text, limit);
}
