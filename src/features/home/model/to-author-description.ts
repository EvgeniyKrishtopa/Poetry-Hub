/**
 * The author card's description from the author's «О себе» (Markdown): a plain-text excerpt of at most
 * `AUTHOR_DESCRIPTION_MAX_LENGTH` characters ending with «…» when cut, or `null` when the text is empty (FR-4).
 */
export function toAuthorDescription(about: string | null): string | null {
  void about;
  throw new Error("not implemented");
}
