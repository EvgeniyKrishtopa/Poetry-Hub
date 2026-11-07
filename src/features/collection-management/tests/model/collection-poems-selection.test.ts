import { describe, expect, it } from "vitest";

import type { CollectionPoemChoice } from "../../model/collection-management.types";
import { isSelectionChanged, selectionDiff, storedSelection } from "../../model/collection-poems-selection";

const IN_COLLECTION = "1a2b3c4d-0000-4000-8000-000000000001";
const ALSO_IN_COLLECTION = "1a2b3c4d-0000-4000-8000-000000000002";
const FREE = "1a2b3c4d-0000-4000-8000-000000000003";
const ALSO_FREE = "1a2b3c4d-0000-4000-8000-000000000004";
const VANISHED = "1a2b3c4d-0000-4000-8000-000000000005";

const CHOICES: readonly CollectionPoemChoice[] = [
  { id: FREE, title: "Первый снег", selected: false },
  { id: IN_COLLECTION, title: "Листопад", selected: true },
  { id: ALSO_FREE, title: "Ноябрь", selected: false },
  { id: ALSO_IN_COLLECTION, title: "Туман", selected: true },
];

describe("storedSelection", () => {
  it("holds the selected ids only", () => {
    expect(storedSelection(CHOICES)).toEqual(new Set([IN_COLLECTION, ALSO_IN_COLLECTION]));
  });

  it("is empty for no choices", () => {
    expect(storedSelection([]).size).toBe(0);
  });
});

describe("isSelectionChanged", () => {
  const stored = new Set([IN_COLLECTION, ALSO_IN_COLLECTION]);

  // implements FR-5 of add-poems-to-collections
  it("is false for the same set in another order", () => {
    expect(isSelectionChanged(stored, new Set([ALSO_IN_COLLECTION, IN_COLLECTION]))).toBe(false);
  });

  // implements FR-5 of add-poems-to-collections
  it.each([
    ["a poem added", new Set([IN_COLLECTION, ALSO_IN_COLLECTION, FREE])],
    ["a poem removed", new Set([IN_COLLECTION])],
    ["one swapped for another, same size", new Set([IN_COLLECTION, FREE])],
    ["everything removed", new Set<string>()],
  ])("is true with %s", (_case, draft) => {
    expect(isSelectionChanged(stored, draft)).toBe(true);
  });

  it("is true when the stored set grew past the draft", () => {
    expect(isSelectionChanged(new Set([IN_COLLECTION, FREE]), new Set([IN_COLLECTION]))).toBe(true);
  });
});

describe("selectionDiff", () => {
  const stored = storedSelection(CHOICES);

  // implements FR-6 of add-poems-to-collections
  it("sends the newly checked as added and the newly unchecked as removed, in choices order", () => {
    const draft = new Set([ALSO_FREE, FREE, ALSO_IN_COLLECTION]);

    expect(selectionDiff(CHOICES, stored, draft)).toEqual({ added: [FREE, ALSO_FREE], removed: [IN_COLLECTION] });
  });

  it("sends nothing for an unchanged draft", () => {
    expect(selectionDiff(CHOICES, stored, new Set(stored))).toEqual({ added: [], removed: [] });
  });

  // implements FR-12 of add-poems-to-collections
  it("ignores ids that are no longer among the choices", () => {
    const draft = new Set([IN_COLLECTION, ALSO_IN_COLLECTION, VANISHED]);
    const storedWithVanished = new Set([...stored, VANISHED]);

    expect(selectionDiff(CHOICES, stored, draft)).toEqual({ added: [], removed: [] });
    expect(selectionDiff(CHOICES, storedWithVanished, new Set(stored))).toEqual({ added: [], removed: [] });
  });
});
