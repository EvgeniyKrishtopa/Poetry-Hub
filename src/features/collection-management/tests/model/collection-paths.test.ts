import { describe, expect, it } from "vitest";

import { collectionPoemsPath, ownPoemPagePath } from "../../model/collection-paths";

const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const POEM_ID = "1a2b3c4d-0000-4000-8000-000000000001";

describe("collection poems paths", () => {
  // implements FR-3 of add-poems-to-collections
  it("builds the collection poems page path", () => {
    expect(collectionPoemsPath(COLLECTION_ID)).toBe(`/account/poems/collections/${COLLECTION_ID}/poems`);
  });

  // implements FR-2 of add-poems-to-collections
  it("builds the owner's poem page path, the same one poem-management's ownPoemPath builds", () => {
    expect(ownPoemPagePath(POEM_ID)).toBe(`/account/poems/${POEM_ID}`);
  });
});
