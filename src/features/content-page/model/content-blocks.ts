import { splitParagraphs } from "@/shared/lib/split-paragraphs";

import type { ContentBlock } from "./content-page.types";

/** A section heading line: the Russian word for "Section", a number, a dot, and a space. */
const SECTION_HEADING_PATTERN = /^Раздел \d+\. /;

/** A subsection heading line: two numbers joined by dots, a closing dot, and a space. */
const SUBSECTION_HEADING_PATTERN = /^\d+\.\d+\. /;

const LINE_BREAK = "\n";

function headingKind(line: string): "section" | "subsection" | null {
  if (SECTION_HEADING_PATTERN.test(line)) return "section";
  if (SUBSECTION_HEADING_PATTERN.test(line)) return "subsection";
  return null;
}

/**
 * Splits the text into paragraphs and turns a paragraph's numbered first line into a heading block;
 * the paragraph's other lines follow as one paragraph. Only the numbering is read, never markup.
 */
export function toContentBlocks(message: string): ContentBlock[] {
  return splitParagraphs(message).flatMap((paragraph): ContentBlock[] => {
    const [firstLine, ...restLines] = paragraph.split(LINE_BREAK);
    const heading = firstLine.trimStart();
    const kind = headingKind(heading);
    if (kind === null) return [{ kind: "paragraph", text: paragraph }];

    const headingBlock: ContentBlock = { kind, text: heading.trimEnd() };
    if (restLines.length === 0) return [headingBlock];
    return [headingBlock, { kind: "paragraph", text: restLines.join(LINE_BREAK) }];
  });
}
