import "server-only";

/**
 * Markdown to a plain-text excerpt (NFR-4): syntax removed, whitespace collapsed, at most `limit`
 * characters, cut at a word boundary with `…` (hard cut when there is no space). Empty when nothing is left.
 */
export function toPlainTextExcerpt(markdown: string, limit: number): string {
  void markdown;
  void limit;
  throw new Error("not implemented");
}
