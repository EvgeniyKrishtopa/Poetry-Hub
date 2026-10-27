import { describe, expect, it } from "vitest";

import { authorPoemPath, authorPoemsPath } from "../../model/poem-paths";

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

describe("poem paths", () => {
  // implements FR-1 of add-author-poems
  it("builds the poem list path under the author page", () => {
    expect(authorPoemsPath(AUTHOR_ID)).toBe(`/authors/${AUTHOR_ID}/poems`);
  });

  // implements FR-2 of add-author-poems
  it("builds one poem's path under the list", () => {
    expect(authorPoemPath(AUTHOR_ID, "osenniy-sad")).toBe(`/authors/${AUTHOR_ID}/poems/osenniy-sad`);
  });
});
