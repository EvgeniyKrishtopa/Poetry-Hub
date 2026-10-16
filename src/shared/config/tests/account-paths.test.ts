import { describe, expect, it } from "vitest";

import { isAccountPath } from "../account-paths";

describe("isAccountPath", () => {
  // implements FR-19 of add-author-profiles
  it.each([
    ["/account", true],
    ["/account/", true],
    ["/account/author", true],
    ["/account/author/x", true],
    ["/accounts", false],
    ["/authors", false],
    ["/", false],
    ["/login", false],
  ])("%s → %s", (pathname, expected) => {
    expect(isAccountPath(pathname)).toBe(expected);
  });
});
