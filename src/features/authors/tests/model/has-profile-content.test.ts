import { describe, expect, it } from "vitest";

import type { ProfileRow } from "../../model/author-profile.schema";
import { hasProfileContent } from "../../model/has-profile-content";

const PROFILE_ID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

const EMPTY_ROW: ProfileRow = {
  id: PROFILE_ID,
  first_name: null,
  last_name: null,
  about: null,
  photo_path: null,
};

describe("hasProfileContent", () => {
  // implements FR-1 of add-author-profiles
  it("is false for a row with every content field empty", () => {
    expect(hasProfileContent(EMPTY_ROW)).toBe(false);
  });

  it.each([
    ["first_name", "Anna"],
    ["last_name", "Akhmatova"],
    ["about", "Поэт"],
    ["photo_path", `${PROFILE_ID}/9c5b94b1-35ad-49bb-b118-8e8fc24abf80.png`],
  ] as const)("is true when only %s is set", (field, value) => {
    expect(hasProfileContent({ ...EMPTY_ROW, [field]: value })).toBe(true);
  });
});
