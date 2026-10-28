import { describe, expect, it } from "vitest";

import { formatCharacterCounter } from "../ui-messages";

describe("formatCharacterCounter", () => {
  // implements FR-11 of add-author-profiles
  it("formats the counter against its limit, also over the limit", () => {
    expect(formatCharacterCounter(2, 1000)).toBe("2 / 1000");
    expect(formatCharacterCounter(1012, 1000)).toBe("1012 / 1000");
    expect(formatCharacterCounter(10001, 10000)).toBe("10001 / 10000");
  });
});
