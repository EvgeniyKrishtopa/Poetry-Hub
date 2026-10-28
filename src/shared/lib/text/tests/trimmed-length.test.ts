import { describe, expect, it } from "vitest";

import { trimmedLength } from "../trimmed-length";

describe("trimmedLength", () => {
  // implements FR-8, FR-11 of add-author-profiles
  it.each([
    ["  hi  ", 2],
    ["", 0],
    ["🌙🌙", 2],
    ["**а**", 5],
  ])("measures %j as %i code points after trimming", (text, length) => {
    expect(trimmedLength(text)).toBe(length);
  });
});
