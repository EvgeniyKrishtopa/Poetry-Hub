import { describe, expect, it } from "vitest";

import { uncollectedPoems } from "../../model/uncollected-poems";
import { AUTUMN_GARDEN, NIGHT_STATION } from "../poem-fixtures";

const COLLECTION_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
const COLLECTED_STATION = { ...NIGHT_STATION, collectionId: COLLECTION_ID };

describe("uncollectedPoems", () => {
  // implements FR-3 of public-collections
  it("keeps only the poems in no collection, in their order", () => {
    expect(uncollectedPoems([COLLECTED_STATION, AUTUMN_GARDEN, NIGHT_STATION])).toEqual([AUTUMN_GARDEN, NIGHT_STATION]);
  });

  // implements FR-9 of drag-and-drop-ordering
  it("keeps the given order, even when it is not the order of creation", () => {
    const authorsOrder = [NIGHT_STATION, AUTUMN_GARDEN, { ...NIGHT_STATION, id: "30000000-0000-4000-8000-000000000099" }];

    expect(uncollectedPoems(authorsOrder)).toEqual(authorsOrder);
  });

  // implements FR-3 of public-collections
  it("returns nothing when every poem is in a collection, or when there are no poems", () => {
    expect(uncollectedPoems([COLLECTED_STATION])).toEqual([]);
    expect(uncollectedPoems([])).toEqual([]);
  });
});
