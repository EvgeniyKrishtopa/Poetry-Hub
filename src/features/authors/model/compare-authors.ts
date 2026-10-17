import type { PublicAuthor } from "./author.types";

/**
 * Compares by Unicode code point. The `<` operator compares UTF-16 code units instead, which
 * orders a character outside the BMP before U+E000–U+FFFF.
 */
function compareByCodePoint(a: string, b: string): number {
  // Spreading a string yields one non-empty string per code point, so `codePointAt(0)` is always set.
  const left = [...a].map((char) => char.codePointAt(0) as number);
  const right = [...b].map((char) => char.codePointAt(0) as number);
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

/** Directory order: lower-cased last name, then first name, by code point, then id (FR-13). */
export function compareAuthors(a: PublicAuthor, b: PublicAuthor): number {
  return (
    compareByCodePoint(a.lastName.toLowerCase(), b.lastName.toLowerCase()) ||
    compareByCodePoint(a.firstName.toLowerCase(), b.firstName.toLowerCase()) ||
    compareByCodePoint(a.id, b.id)
  );
}
