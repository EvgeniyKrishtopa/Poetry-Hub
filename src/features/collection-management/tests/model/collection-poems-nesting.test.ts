import { describe, expect, it } from "vitest";

import { nestCollectedPoems } from "../../model/collection-poems-nesting";

const SPRING_ID = "40000000-0000-4000-8000-000000000002";
const AUTUMN_ID = "40000000-0000-4000-8000-000000000001";
const EMPTY_ID = "40000000-0000-4000-8000-000000000003";
const UNLISTED_ID = "40000000-0000-4000-8000-000000000004";

const NEWEST_SPRING_POEM = { collectionId: SPRING_ID, id: "50000000-0000-4000-8000-000000000003", title: "Капель" };
const AUTUMN_POEM = { collectionId: AUTUMN_ID, id: "50000000-0000-4000-8000-000000000002", title: "Листопад" };
const OLDEST_SPRING_POEM = { collectionId: SPRING_ID, id: "50000000-0000-4000-8000-000000000001", title: "Проталина" };

describe("nestCollectedPoems", () => {
  // implements FR-11 of add-poems-to-collections
  it("nests each collection's poems in the read's order, keeps the collections' order, and gives an empty one no poems", () => {
    const collections = [
      { id: SPRING_ID, title: "Весна" },
      { id: EMPTY_ID, title: "Пустой" },
      { id: AUTUMN_ID, title: "Осенний цикл" },
    ];

    // Newest first across collections, as `my_collected_poems` returns them.
    expect(nestCollectedPoems(collections, [NEWEST_SPRING_POEM, AUTUMN_POEM, OLDEST_SPRING_POEM])).toEqual([
      { id: SPRING_ID, title: "Весна", poems: [NEWEST_SPRING_POEM, OLDEST_SPRING_POEM] },
      { id: EMPTY_ID, title: "Пустой", poems: [] },
      { id: AUTUMN_ID, title: "Осенний цикл", poems: [AUTUMN_POEM] },
    ]);
  });

  // implements FR-9 of drag-and-drop-ordering
  it("keeps the author's order of the poems inside a collection, not the order of the ids", () => {
    const collections = [{ id: SPRING_ID, title: "Весна" }];

    expect(nestCollectedPoems(collections, [OLDEST_SPRING_POEM, NEWEST_SPRING_POEM])).toEqual([
      { id: SPRING_ID, title: "Весна", poems: [OLDEST_SPRING_POEM, NEWEST_SPRING_POEM] },
    ]);
  });

  it("leaves out a poem whose collection isn't listed", () => {
    const stray = { collectionId: UNLISTED_ID, id: "50000000-0000-4000-8000-000000000004", title: "Туман" };

    expect(nestCollectedPoems([{ id: AUTUMN_ID, title: "Осенний цикл" }], [stray, AUTUMN_POEM])).toEqual([
      { id: AUTUMN_ID, title: "Осенний цикл", poems: [AUTUMN_POEM] },
    ]);
  });

  it("returns no collections when there are none", () => {
    expect(nestCollectedPoems([], [AUTUMN_POEM])).toEqual([]);
  });
});
