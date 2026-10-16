import { describe, expect, it } from "vitest";

import { authorPagePath } from "../../model/author-page-path";

describe("authorPagePath", () => {
  it("puts the profile id under /authors", () => {
    expect(authorPagePath("8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b")).toBe("/authors/8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b");
  });
});
