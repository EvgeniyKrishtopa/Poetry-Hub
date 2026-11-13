import { describe, expect, it } from "vitest";

import { nestBoard } from "../../model/board-nesting";

describe("nestBoard", () => {
  // implements FR-9 of drag-and-drop-ordering
  it("nests poems under their collection and keeps the order given", () => {
    const board = nestBoard(
      [
        { id: "second", title: "Вторая" },
        { id: "first", title: "Первая" },
      ],
      [
        { id: "p3", title: "В", collectionId: "first" },
        { id: "p1", title: "А", collectionId: "second" },
        { id: "p2", title: "Б", collectionId: "first" },
      ],
    );

    expect(board.collections.map((collection) => collection.id)).toEqual(["second", "first"]);
    expect(board.collections[1]?.poems.map((poem) => poem.id)).toEqual(["p3", "p2"]);
    expect(board.freePoems).toEqual([]);
  });

  // implements FR-9 of drag-and-drop-ordering
  it("puts poems with no collection among the free poems, in order", () => {
    const board = nestBoard([], [
      { id: "p2", title: "Б", collectionId: null },
      { id: "p1", title: "А", collectionId: null },
    ]);

    expect(board.freePoems).toEqual([
      { id: "p2", title: "Б" },
      { id: "p1", title: "А" },
    ]);
  });

  // implements FR-3 of drag-and-drop-ordering
  it("gives a collection with no poem an empty list", () => {
    expect(nestBoard([{ id: "c", title: "Пустой" }], []).collections).toEqual([{ id: "c", title: "Пустой", poems: [] }]);
  });

  it("leaves out a poem whose collection is not listed", () => {
    const board = nestBoard([{ id: "c", title: "Сборник" }], [{ id: "p", title: "А", collectionId: "elsewhere" }]);

    expect(board.collections[0]?.poems).toEqual([]);
    expect(board.freePoems).toEqual([]);
  });
});
