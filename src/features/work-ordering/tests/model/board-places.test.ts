import { describe, expect, it } from "vitest";

import { boardPlaces, nextKeyboardCollectionIndex, nextKeyboardPlace, type Place } from "../../model/board-places";
import type { Arrangement } from "../../model/work-ordering.types";

import { BOARD } from "./board-fixtures";

const inCollection = (collectionId: string, index: number): Place => ({
  container: { kind: "collection", collectionId },
  index,
});
const inFree = (index: number): Place => ({ container: { kind: "free" }, index });

describe("boardPlaces", () => {
  // implements FR-7 of drag-and-drop-ordering
  it("lists every list's places in reading order, the lifted poem taken out", () => {
    // «А» lifted: Осень keeps Б, В (3 places), Зима Г (2), Пустой none (1), the free list Д, Е (3).
    expect(boardPlaces(BOARD, "a")).toEqual([
      inCollection("autumn", 0),
      inCollection("autumn", 1),
      inCollection("autumn", 2),
      inCollection("winter", 0),
      inCollection("winter", 1),
      inCollection("empty", 0),
      inFree(0),
      inFree(1),
      inFree(2),
    ]);
  });

  // implements FR-7 of drag-and-drop-ordering
  it("gives an empty collection one place and an empty free list one place", () => {
    const board: Arrangement = { collections: [{ id: "only", title: "Один", poems: [] }], freePoems: [] };

    expect(boardPlaces(board, "nobody")).toEqual([inCollection("only", 0), inFree(0)]);
  });
});

describe("nextKeyboardPlace", () => {
  // implements FR-7 of drag-and-drop-ordering
  it("steps one place inside a list", () => {
    expect(nextKeyboardPlace(BOARD, "c", inCollection("autumn", 2), "up")).toEqual(inCollection("autumn", 1));
    expect(nextKeyboardPlace(BOARD, "c", inCollection("autumn", 0), "down")).toEqual(inCollection("autumn", 1));
  });

  // implements FR-7 of drag-and-drop-ordering
  it("crosses from the end of a list into the start of the next one, and back", () => {
    expect(nextKeyboardPlace(BOARD, "c", inCollection("autumn", 2), "down")).toEqual(inCollection("winter", 0));
    expect(nextKeyboardPlace(BOARD, "c", inCollection("winter", 0), "up")).toEqual(inCollection("autumn", 2));
  });

  // implements FR-7 of drag-and-drop-ordering
  it("reaches an empty collection, then the free poems", () => {
    // «Г» lifted from «Зима»: its own list has the one place left, so the next step is the empty collection.
    expect(nextKeyboardPlace(BOARD, "d", inCollection("winter", 0), "down")).toEqual(inCollection("empty", 0));
    expect(nextKeyboardPlace(BOARD, "d", inCollection("empty", 0), "down")).toEqual(inFree(0));
  });

  // implements FR-7 of drag-and-drop-ordering
  it("does nothing at the first and the last place of the board, with no wrap", () => {
    expect(nextKeyboardPlace(BOARD, "a", inCollection("autumn", 0), "up")).toBeNull();
    expect(nextKeyboardPlace(BOARD, "e", inFree(2), "down")).toBeNull();
  });

  it("does nothing for a place that is not on the board", () => {
    expect(nextKeyboardPlace(BOARD, "a", inCollection("gone", 0), "down")).toBeNull();
  });

  // implements FR-7 of drag-and-drop-ordering
  it("moves a poem into the free list when it is the only one on the board", () => {
    const board: Arrangement = { collections: [{ id: "only", title: "Один", poems: [{ id: "p", title: "А" }] }], freePoems: [] };

    expect(nextKeyboardPlace(board, "p", inCollection("only", 0), "down")).toEqual(inFree(0));
    expect(nextKeyboardPlace(board, "p", inFree(0), "up")).toEqual(inCollection("only", 0));
  });
});

describe("nextKeyboardCollectionIndex", () => {
  // implements FR-7 of drag-and-drop-ordering: a collection steps among the collections only
  it.each([
    [2, 0, "down", 1],
    [2, 1, "up", 0],
    [2, 2, "down", null],
    [2, 0, "up", null],
    [0, 0, "down", null],
  ] as const)("with %i other collections, from place %i going %s gives %s", (others, current, direction, expected) => {
    expect(nextKeyboardCollectionIndex(others, current, direction)).toBe(expected);
  });
});
