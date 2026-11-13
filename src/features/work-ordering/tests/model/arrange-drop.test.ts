import { describe, expect, it } from "vitest";

import { arrangeDrop } from "../../model/arrange-drop";
import type { PoemContainer } from "../../model/work-ordering.types";

import { BOARD, poemIds } from "./board-fixtures";

const AUTUMN: PoemContainer = { kind: "collection", collectionId: "autumn" };
const WINTER: PoemContainer = { kind: "collection", collectionId: "winter" };
const EMPTY: PoemContainer = { kind: "collection", collectionId: "empty" };
const FREE: PoemContainer = { kind: "free" };

describe("arrangeDrop, a poem inside one list", () => {
  // implements FR-2 of drag-and-drop-ordering
  it("moves a poem up inside a collection", () => {
    const next = arrangeDrop(BOARD, { kind: "poem", poemId: "c", from: AUTUMN, to: AUTUMN, toIndex: 0 });

    expect(poemIds(next, "autumn")).toEqual(["c", "a", "b"]);
  });

  // implements FR-2 of drag-and-drop-ordering
  it("returns the same arrangement when the poem is dropped on its own place", () => {
    const next = arrangeDrop(BOARD, { kind: "poem", poemId: "b", from: AUTUMN, to: AUTUMN, toIndex: 1 });

    expect(next).toBe(BOARD);
  });

  // implements FR-4 of drag-and-drop-ordering
  it("reorders the free poems among themselves", () => {
    const next = arrangeDrop(BOARD, { kind: "poem", poemId: "e", from: FREE, to: FREE, toIndex: 1 });

    expect(poemIds(next, null)).toEqual(["f", "e"]);
  });

  // implements FR-2 of drag-and-drop-ordering: the database clamps the same way
  it.each([
    [-5, ["c", "a", "b"]],
    [99, ["a", "b", "c"]],
  ])("clamps the place %i into the list", (toIndex, expected) => {
    const next = arrangeDrop(BOARD, { kind: "poem", poemId: "c", from: AUTUMN, to: AUTUMN, toIndex });

    expect(poemIds(next, "autumn")).toEqual(expected);
  });
});

describe("arrangeDrop, a poem between lists", () => {
  // implements FR-3 of drag-and-drop-ordering
  it("moves a poem into the middle of another collection and out of the first", () => {
    const next = arrangeDrop(BOARD, { kind: "poem", poemId: "a", from: AUTUMN, to: WINTER, toIndex: 0 });

    expect(poemIds(next, "autumn")).toEqual(["b", "c"]);
    expect(poemIds(next, "winter")).toEqual(["a", "d"]);
  });

  // implements FR-3 of drag-and-drop-ordering
  it("moves a poem into an empty collection", () => {
    const next = arrangeDrop(BOARD, { kind: "poem", poemId: "d", from: WINTER, to: EMPTY, toIndex: 0 });

    expect(poemIds(next, "empty")).toEqual(["d"]);
    expect(poemIds(next, "winter")).toEqual([]);
  });

  // implements FR-4 of drag-and-drop-ordering
  it("moves a free poem into a collection", () => {
    const next = arrangeDrop(BOARD, { kind: "poem", poemId: "f", from: FREE, to: AUTUMN, toIndex: 3 });

    expect(poemIds(next, "autumn")).toEqual(["a", "b", "c", "f"]);
    expect(poemIds(next, null)).toEqual(["e"]);
  });

  // implements FR-4 of drag-and-drop-ordering
  it("moves a poem out of a collection to the free poems", () => {
    const next = arrangeDrop(BOARD, { kind: "poem", poemId: "b", from: AUTUMN, to: FREE, toIndex: 1 });

    expect(poemIds(next, null)).toEqual(["e", "b", "f"]);
    expect(poemIds(next, "autumn")).toEqual(["a", "c"]);
  });

  // implements FR-3 of drag-and-drop-ordering: the last poem leaves, the collection stays on the owner's board
  it("keeps a collection whose last poem left, now empty", () => {
    const next = arrangeDrop(BOARD, { kind: "poem", poemId: "d", from: WINTER, to: FREE, toIndex: 0 });

    expect(next.collections.map((collection) => collection.id)).toEqual(["autumn", "winter", "empty"]);
    expect(poemIds(next, "winter")).toEqual([]);
  });

  // implements FR-11 of drag-and-drop-ordering
  it.each([
    ["an unknown poem", { poemId: "zzz", from: AUTUMN, to: WINTER }],
    ["a poem that is not in the named source list", { poemId: "d", from: AUTUMN, to: WINTER }],
    ["an unknown target collection", { poemId: "a", from: AUTUMN, to: { kind: "collection", collectionId: "gone" } }],
  ] as const)("returns the arrangement itself for %s", (_case, drop) => {
    expect(arrangeDrop(BOARD, { kind: "poem", toIndex: 0, ...drop })).toBe(BOARD);
  });

  it("does not change the arrangement it was given", () => {
    const before = structuredClone(BOARD);

    arrangeDrop(BOARD, { kind: "poem", poemId: "a", from: AUTUMN, to: FREE, toIndex: 0 });

    expect(BOARD).toEqual(before);
  });
});

describe("arrangeDrop, a collection", () => {
  // implements FR-5 of drag-and-drop-ordering
  it("moves a collection to the top and keeps its poems", () => {
    const next = arrangeDrop(BOARD, { kind: "collection", collectionId: "winter", toIndex: 0 });

    expect(next.collections.map((collection) => collection.id)).toEqual(["winter", "autumn", "empty"]);
    expect(poemIds(next, "winter")).toEqual(["d"]);
  });

  // implements FR-5 of drag-and-drop-ordering
  it("returns the same arrangement when the collection stays", () => {
    expect(arrangeDrop(BOARD, { kind: "collection", collectionId: "autumn", toIndex: 0 })).toBe(BOARD);
  });

  // implements FR-5 of drag-and-drop-ordering
  it("moves a collection beyond the end to the last place", () => {
    const next = arrangeDrop(BOARD, { kind: "collection", collectionId: "autumn", toIndex: 99 });

    expect(next.collections.map((collection) => collection.id)).toEqual(["winter", "empty", "autumn"]);
  });

  it("returns the arrangement itself for an unknown collection", () => {
    expect(arrangeDrop(BOARD, { kind: "collection", collectionId: "gone", toIndex: 0 })).toBe(BOARD);
  });
});
