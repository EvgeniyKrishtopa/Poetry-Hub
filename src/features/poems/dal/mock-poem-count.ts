/** Each author gets 0 to 4 mock poems: one count per value of the sum modulo this. */
const MOCK_POEM_COUNT_VARIANTS = 5;

/**
 * How many mock poems an author gets (design D2): the sum of the lowercased id's UTF-16 code units,
 * modulo 5. Pure, so it is the same on every request, build, and machine; lowercasing keeps an
 * uppercase spelling of the same UUID on the same count.
 */
export function mockPoemCount(authorId: string): number {
  let sum = 0;
  for (const char of authorId.toLowerCase()) sum += char.charCodeAt(0);
  return sum % MOCK_POEM_COUNT_VARIANTS;
}
