import { describe, expect, it } from "vitest";

import { PUBLIC_COLLECTIONS_SEGMENT, publicCollectionPath } from "../../model/public-collection-paths";

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const COLLECTION_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";

describe("public collection paths", () => {
  // implements FR-2 and FR-5 of public-collections
  it("builds the collection page path under the author page", () => {
    expect(publicCollectionPath(AUTHOR_ID, COLLECTION_ID)).toBe(`/authors/${AUTHOR_ID}/collections/${COLLECTION_ID}`);
  });

  // implements FR-6 of public-collections
  it("names the segment the breadcrumbs match", () => {
    expect(PUBLIC_COLLECTIONS_SEGMENT).toBe("collections");
  });
});
