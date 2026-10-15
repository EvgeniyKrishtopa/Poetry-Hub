import type { PublicAuthor } from "./author.types";

/**
 * Compares by Unicode code point. The `<` operator compares UTF-16 code units instead, which
 * orders a character outside the BMP before U+E000–U+FFFF.
 */
function compareByCodePoint(a: string, b: string): number {
  const left = [...a];
  const right = [...b];
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index].codePointAt(0) ?? 0) - (right[index].codePointAt(0) ?? 0);
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
