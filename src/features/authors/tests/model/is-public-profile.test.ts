import { describe, expect, it } from "vitest";

import { isPublicProfile } from "../../model/is-public-profile";

describe("isPublicProfile", () => {
  // implements FR-4 of add-author-profiles
  it.each([
    ["both names", "Anna", "Akhmatova", true],
    ["first name only", "Anna", null, false],
    ["last name only", null, "Akhmatova", false],
    ["no names", null, null, false],
    ["an empty last name", "Anna", "", false],
  ])("%s → %s", (_case, firstName, lastName, expected) => {
    expect(isPublicProfile({ firstName, lastName })).toBe(expected);
  });
});
