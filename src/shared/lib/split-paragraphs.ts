/** One or more blank lines (whitespace-only lines count as blank) separate paragraphs. */
const PARAGRAPH_SEPARATOR = /\n\s*\n/;

/** Splits plain text into paragraphs at blank lines; single line breaks stay inside a paragraph. */
export function splitParagraphs(text: string): string[] {
  return text.split(PARAGRAPH_SEPARATOR);
}
