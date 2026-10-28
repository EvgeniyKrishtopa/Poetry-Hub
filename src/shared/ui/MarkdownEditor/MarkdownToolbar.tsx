import { Button } from "../Button/Button";
import { MARKDOWN_FORMAT_LABELS } from "../ui-messages";

import type { MarkdownToolbarProps } from "./MarkdownToolbar.types";

/** The editor's format buttons with Russian accessible names (add-author-profiles FR-11, NFR-5). */
export function MarkdownToolbar({ formats, onFormat }: MarkdownToolbarProps) {
  return (
    <div className="-ml-4 flex flex-wrap gap-1">
      {formats.map((format) => (
        <Button key={format} variant="ghost" onClick={() => onFormat(format)}>
          {MARKDOWN_FORMAT_LABELS[format]}
        </Button>
      ))}
    </div>
  );
}
