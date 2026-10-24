import { describe, expect, it } from "vitest";

import { mockPoemCount } from "../../dal/mock-poem-count";

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

/**
 * The base UUID's code units sum to 1728 (1728 mod 5 = 3); raising its last decimal digit by d
 * raises the sum by d, so each last digit lands on one count (design D2).
 */
const UUID_FOR_COUNT: readonly [number, string][] = [
  [0, "00000000-0000-4000-8000-000000000002"],
  [1, "00000000-0000-4000-8000-000000000003"],
  [2, "00000000-0000-4000-8000-000000000004"],
  [3, "00000000-0000-4000-8000-000000000000"],
  [4, "00000000-0000-4000-8000-000000000001"],
];

describe("mockPoemCount", () => {
  // implements FR-7 of add-author-poems
  it("gives the same count for the same id", () => {
    expect(mockPoemCount(AUTHOR_ID)).toBe(mockPoemCount(AUTHOR_ID));
  });

  // implements FR-7 of add-author-poems
  it("gives an uppercase spelling of the id the same count", () => {
    expect(mockPoemCount(AUTHOR_ID.toUpperCase())).toBe(mockPoemCount(AUTHOR_ID));
  });

  // implements FR-7 of add-author-poems
  it.each(UUID_FOR_COUNT)("reaches a count of %i", (count, id) => {
    expect(mockPoemCount(id)).toBe(count);
  });
});
