import { describe, expect, it } from "vitest";

import { publicCollectionPath } from "@/features/collections";
import { authorPoemPath } from "@/features/poems";

import { violationContentHref } from "../../model/violation-content-href";

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const CONTENT_ID = "30000000-0000-4000-8000-000000000021";

describe("violationContentHref", () => {
  // implements FR-4 of admin-violations-feedback: admin cannot import these helpers, so the paths are pinned here
  it("builds the poem's public page the way the poems feature does", () => {
    expect(violationContentHref(AUTHOR_ID, "poem", CONTENT_ID)).toBe(authorPoemPath(AUTHOR_ID, CONTENT_ID));
  });

  // implements FR-4 of admin-violations-feedback
  it("builds the collection's public page the way the collections feature does", () => {
    expect(violationContentHref(AUTHOR_ID, "collection", CONTENT_ID)).toBe(
      publicCollectionPath(AUTHOR_ID, CONTENT_ID),
    );
  });
});
