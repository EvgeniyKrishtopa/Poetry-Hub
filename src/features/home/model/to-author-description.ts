import { toPlainTextExcerpt } from "@/shared/lib/seo";

import { AUTHOR_DESCRIPTION_MAX_LENGTH } from "./home.constants";

/**
 * The author card's description from the author's about text (Markdown): a plain-text excerpt of at most
 * `AUTHOR_DESCRIPTION_MAX_LENGTH` characters ending with an ellipsis when cut, or `null` when the text is empty (FR-4).
 */
export function toAuthorDescription(about: string | null): string | null {
  if (about === null) return null;

  const excerpt = toPlainTextExcerpt(about, AUTHOR_DESCRIPTION_MAX_LENGTH);
  return excerpt === "" ? null : excerpt;
}
