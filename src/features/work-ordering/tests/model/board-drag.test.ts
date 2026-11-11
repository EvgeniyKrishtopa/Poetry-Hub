import { describe, expect, it } from "vitest";

import { arrangeOver, dropBetween, enteredContainer, stepArrangement } from "../../model/board-drag";
import { findPoem } from "../../model/board-lookup";
import type { DraggedItem } from "../../model/work-ordering.types";

import { BOARD, poemIds } from "./board-fixtures";

const poem = (id: string): DraggedItem => ({ type: "poem", id });
const collection = (id: string): DraggedItem => ({ type: "collection", id });

describe("arrangeOver", () => {
  // implements FR-2 of drag-and-drop-ordering
  it("moves a poem to the place of the poem it passes over, in its own list", () => {
    const next = arrangeOver(BOARD, poem("c"), { kind: "poem", poemId: "a" });

    expect(poemIds(next, "autumn")).toEqual(["c", "a", "b"]);
  });

  // implements FR-3 of drag-and-drop-ordering
  it("moves a poem before the poem it passes over in another collection", () => {
    const next = arrangeOver(BOARD, poem("a"), { kind: "poem", poemId: "d" });

    expect(poemIds(next, "winter")).toEqual(["a", "d"]);
    expect(poemIds(next, "autumn")).toEqual(["b", "c"]);
  });

  // implements FR-3 of drag-and-drop-ordering
  it("puts a poem last in a list whose area it enters, an empty collection included", () => {
    const empty = arrangeOver(BOARD, poem("a"), { kind: "list", container: { kind: "collection", collectionId: "empty" } });
    const free = arrangeOver(BOARD, poem("a"), { kind: "list", container: { kind: "free" } });

    expect(poemIds(empty, "empty")).toEqual(["a"]);
    expect(poemIds(free, null)).toEqual(["e", "f", "a"]);
  });

  it("leaves a poem where it is over its own list's area", () => {
    expect(arrangeOver(BOARD, poem("a"), { kind: "list", container: { kind: "collection", collectionId: "autumn" } })).toBe(BOARD);
  });

  // implements FR-5 of drag-and-drop-ordering
  it("moves a collection to the place of the collection it passes over", () => {
    const next = arrangeOver(BOARD, collection("autumn"), { kind: "collection", collectionId: "empty" });

    expect(next.collections.map((entry) => entry.id)).toEqual(["winter", "empty", "autumn"]);
  });

  // implements FR-5 of drag-and-drop-ordering: a collection cannot nest
  it("ignores a collection over a poem or a list", () => {
    expect(arrangeOver(BOARD, collection("autumn"), { kind: "poem", poemId: "d" })).toBe(BOARD);
    expect(arrangeOver(BOARD, collection("autumn"), { kind: "list", container: { kind: "free" } })).toBe(BOARD);
  });

  it("ignores an unknown item or target", () => {
    expect(arrangeOver(BOARD, poem("zzz"), { kind: "poem", poemId: "a" })).toBe(BOARD);
    expect(arrangeOver(BOARD, poem("a"), { kind: "poem", poemId: "zzz" })).toBe(BOARD);
    expect(arrangeOver(BOARD, collection("autumn"), { kind: "collection", collectionId: "zzz" })).toBe(BOARD);
  });
});

describe("stepArrangement", () => {
  // implements FR-7 of drag-and-drop-ordering
  it("steps a poem up inside its list", () => {
    expect(poemIds(stepArrangement(BOARD, poem("c"), "up"), "autumn")).toEqual(["a", "c", "b"]);
  });

  // implements FR-7 of drag-and-drop-ordering
  it("steps a poem from the end of a list into the start of the next one", () => {
    const next = stepArrangement(BOARD, poem("c"), "down");

    expect(poemIds(next, "autumn")).toEqual(["a", "b"]);
    expect(poemIds(next, "winter")).toEqual(["c", "d"]);
  });

  // implements FR-7 of drag-and-drop-ordering
  it("steps a poem into an empty collection", () => {
    expect(poemIds(stepArrangement(BOARD, poem("d"), "down"), "empty")).toEqual(["d"]);
  });

  // implements FR-7 of drag-and-drop-ordering
  it("does nothing at the first and the last place of the board", () => {
    expect(stepArrangement(BOARD, poem("a"), "up")).toBe(BOARD);
    expect(stepArrangement(BOARD, poem("f"), "down")).toBe(BOARD);
  });

  // implements FR-7 of drag-and-drop-ordering: a collection steps among the collections only
  it("steps a collection among the collections, and stops at the ends", () => {
    expect(stepArrangement(BOARD, collection("autumn"), "down").collections.map((entry) => entry.id)).toEqual([
      "winter",
      "autumn",
      "empty",
    ]);
    expect(stepArrangement(BOARD, collection("autumn"), "up")).toBe(BOARD);
    expect(stepArrangement(BOARD, collection("empty"), "down")).toBe(BOARD);
  });

  it("does nothing for an unknown item", () => {
    expect(stepArrangement(BOARD, poem("zzz"), "down")).toBe(BOARD);
    expect(stepArrangement(BOARD, collection("zzz"), "down")).toBe(BOARD);
  });
});

describe("dropBetween", () => {
  // implements FR-3 of drag-and-drop-ordering
  it("describes a poem that ended in another collection", () => {
    const final = stepArrangement(BOARD, poem("c"), "down");

    expect(dropBetween(BOARD, final, poem("c"))).toEqual({
      kind: "poem",
      poemId: "c",
      from: { kind: "collection", collectionId: "autumn" },
      to: { kind: "collection", collectionId: "winter" },
      toIndex: 0,
    });
  });

  // implements FR-2 of drag-and-drop-ordering: dropped on its own place sends nothing
  it("returns null for an item that ended where it started", () => {
    const wandered = stepArrangement(stepArrangement(BOARD, poem("b"), "down"), poem("b"), "up");

    expect(findPoem(wandered, "b")?.index).toBe(1);
    expect(dropBetween(BOARD, wandered, poem("b"))).toBeNull();
    expect(dropBetween(BOARD, BOARD, collection("winter"))).toBeNull();
  });

  // implements FR-5 of drag-and-drop-ordering
  it("describes a collection that ended elsewhere among the collections", () => {
    const final = stepArrangement(BOARD, collection("autumn"), "down");

    expect(dropBetween(BOARD, final, collection("autumn"))).toEqual({ kind: "collection", collectionId: "autumn", toIndex: 1 });
  });

  it("returns null when the item is missing from either arrangement", () => {
    expect(dropBetween(BOARD, BOARD, poem("zzz"))).toBeNull();
    expect(dropBetween(BOARD, BOARD, collection("zzz"))).toBeNull();
  });
});

describe("enteredContainer", () => {
  const AUTUMN = { kind: "collection", collectionId: "autumn" } as const;

  // implements FR-3 of drag-and-drop-ordering
  it("names the list a held poem has entered", () => {
    const moved = stepArrangement(BOARD, poem("c"), "down");

    expect(enteredContainer(moved, "c", AUTUMN)).toEqual({ kind: "collection", collectionId: "winter" });
  });

  // implements FR-2 of drag-and-drop-ordering
  it("is null while the poem is still in the list it came from", () => {
    expect(enteredContainer(BOARD, "c", AUTUMN)).toBeNull();
  });

  it("is null for a poem that is no longer on the board", () => {
    expect(enteredContainer(BOARD, "zzz", AUTUMN)).toBeNull();
  });
});
