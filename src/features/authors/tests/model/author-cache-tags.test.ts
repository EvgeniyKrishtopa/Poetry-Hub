import { describe, expect, it } from "vitest";

import { authorTag, AUTHORS_TAG } from "../../model/author-cache-tags";

const PROFILE_ID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

describe("author cache tags", () => {
  // implements FR-17 of add-author-profiles
  it("tags the directory and each author separately", () => {
    expect(AUTHORS_TAG).toBe("authors");
    expect(authorTag(PROFILE_ID)).toBe(`author:${PROFILE_ID}`);
  });
});
