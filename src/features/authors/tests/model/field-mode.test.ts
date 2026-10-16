import { describe, expect, it } from "vitest";

import { getFieldMode } from "../../model/field-mode";

describe("getFieldMode", () => {
  // implements FR-7 of add-author-profiles
  it.each([
    [false, false, "view"],
    [false, true, "edit"],
    [true, false, "view"],
    [true, true, "view"],
  ] as const)("pending %s, editing %s → %s", (isPending, isEditing, expected) => {
    expect(getFieldMode(isPending, isEditing)).toBe(expected);
  });
});
