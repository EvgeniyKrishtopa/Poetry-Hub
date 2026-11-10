import { describe, expect, it } from "vitest";

import { selectFreePoems } from "../../model/free-poems";

const FIRST_SNOW = { id: "30000000-0000-4000-8000-000000000033", title: "Первый снег" };
const NIGHT_STATION = { id: "30000000-0000-4000-8000-000000000032", title: "Ночной вокзал" };
const AUTUMN_GARDEN = { id: "30000000-0000-4000-8000-000000000031", title: "Осенний сад" };
const UNKNOWN_ID = "30000000-0000-4000-8000-000000000099";

const NEWEST_FIRST = [FIRST_SNOW, NIGHT_STATION, AUTUMN_GARDEN];

describe("selectFreePoems", () => {
  // implements FR-1 of show-only-free-poems
  it("keeps only the poems in no collection, in the given order", () => {
    expect(selectFreePoems(NEWEST_FIRST, [{ id: NIGHT_STATION.id }])).toEqual([FIRST_SNOW, AUTUMN_GARDEN]);
  });

  // implements FR-1 of show-only-free-poems
  it("returns every poem when none is collected", () => {
    expect(selectFreePoems(NEWEST_FIRST, [])).toEqual(NEWEST_FIRST);
  });

  // implements FR-1 of show-only-free-poems
  it("returns nothing when every poem is collected", () => {
    expect(selectFreePoems(NEWEST_FIRST, NEWEST_FIRST)).toEqual([]);
  });

  it("ignores a collected id that matches no poem", () => {
    expect(selectFreePoems(NEWEST_FIRST, [{ id: UNKNOWN_ID }])).toEqual(NEWEST_FIRST);
  });
});
