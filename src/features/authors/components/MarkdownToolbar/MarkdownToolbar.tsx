import { Button } from "@/shared/ui";

import { FORMAT_LABELS } from "../../model/author-messages";
import type { MarkdownFormat } from "../../model/author.types";

import type { MarkdownToolbarProps } from "./MarkdownToolbar.types";

const FORMATS: readonly MarkdownFormat[] = ["bold", "italic", "heading", "subheading", "bulleted", "numbered", "quote"];

/** The seven Markdown format buttons with Russian accessible names (FR-11, NFR-5). */
export function MarkdownToolbar({ onFormat }: MarkdownToolbarProps) {
  return (
    <div className="-ml-4 flex flex-wrap gap-1">
      {FORMATS.map((format) => (
        <Button key={format} variant="ghost" onClick={() => onFormat(format)}>
          {FORMAT_LABELS[format]}
        </Button>
      ))}
    </div>
  );
}
