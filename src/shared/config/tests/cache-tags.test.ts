import { describe, expect, it } from "vitest";

import { authorWorksTag } from "../cache-tags";

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const OTHER_AUTHOR_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

describe("authorWorksTag", () => {
  // implements NFR-2 of public-collections
  it("is one stable tag per author, prefixed with author-works", () => {
    expect(authorWorksTag(AUTHOR_ID)).toBe(`author-works:${AUTHOR_ID}`);
    expect(authorWorksTag(AUTHOR_ID)).toBe(authorWorksTag(AUTHOR_ID));
  });

  // implements NFR-2 of public-collections
  it("differs between authors", () => {
    expect(authorWorksTag(AUTHOR_ID)).not.toBe(authorWorksTag(OTHER_AUTHOR_ID));
  });
});
