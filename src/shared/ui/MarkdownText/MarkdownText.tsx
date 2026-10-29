import Markdown from "react-markdown";

import { MARKDOWN_VARIANTS } from "./markdown-variants";
import type { MarkdownTextProps } from "./MarkdownText.types";

/**
 * Markdown rendered by an element allowlist, raw HTML skipped, always left-aligned
 * (add-author-profiles NFR-1, add-poem-creation NFR-5).
 */
export function MarkdownText({ markdown, variant = "about" }: MarkdownTextProps) {
  const { allowedElements, components, className } = MARKDOWN_VARIANTS[variant];

  return (
    <div className={className}>
      {/* skipHtml drops raw HTML outright; unwrapDisallowed keeps a link's or heading's text. */}
      <Markdown skipHtml allowedElements={allowedElements} unwrapDisallowed components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
