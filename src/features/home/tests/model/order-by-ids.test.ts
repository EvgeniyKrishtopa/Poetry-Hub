import { describe, expect, it } from "vitest";

import { orderByIds } from "../../model/order-by-ids";

interface Item {
  readonly id: string;
  readonly label: string;
}

const FIRST: Item = { id: "a", label: "first" };
const SECOND: Item = { id: "b", label: "second" };
const THIRD: Item = { id: "c", label: "third" };

function getId(item: Item): string {
  return item.id;
}

describe("orderByIds", () => {
  // implements FR-2, FR-4 of home-page-sections
  it("returns the items in the order of the ids, not the order the items came in", () => {
    const ordered = orderByIds(["c", "a", "b"], [FIRST, SECOND, THIRD], getId);

    expect(ordered).toEqual([THIRD, FIRST, SECOND]);
  });

  // implements FR-2, FR-4 of home-page-sections
  it("drops an id that did not resolve to an item", () => {
    const ordered = orderByIds(["c", "missing", "a"], [FIRST, THIRD], getId);

    expect(ordered).toEqual([THIRD, FIRST]);
  });

  // implements FR-2, FR-4 of home-page-sections
  it("ignores an item whose id was not asked for", () => {
    const ordered = orderByIds(["b"], [FIRST, SECOND, THIRD], getId);

    expect(ordered).toEqual([SECOND]);
  });

  // implements FR-2 of home-page-sections
  it("returns nothing for no ids", () => {
    expect(orderByIds([], [FIRST], getId)).toEqual([]);
  });
});
