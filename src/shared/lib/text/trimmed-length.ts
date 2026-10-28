/**
 * A text's length after trimming, in Unicode code points: the one measure validation, the
 * about counter, and the database's `char_length` share (FR-8, FR-11).
 */
export function trimmedLength(text: string): number {
  return [...text.trim()].length;
}
