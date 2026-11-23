import { describe, expect, it } from "vitest";

import type { HomeEntry } from "../../model/home-entry.types";
import { reorderHomeEntries } from "../../model/reorder-home-entries";

function entry(id: string, position: number): HomeEntry {
  return { kind: "poem", id, position, shown: true, label: `Poem ${id}`, authorName: "Anna" };
}

const A = entry("a", 1);
const B = entry("b", 2);
const C = entry("c", 3);

const orderOf = (entries: readonly HomeEntry[]) => entries.map((item) => item.id);
const positionsOf = (entries: readonly HomeEntry[]) => entries.map((item) => item.position);

describe("reorderHomeEntries", () => {
  // implements FR-9 of home-page-sections
  it("drops the last entry before the second, as the Reorder scenario reads A, C, B", () => {
    const reordered = reorderHomeEntries([A, B, C], { id: "c", toPosition: 2 });

    expect(orderOf(reordered)).toEqual(["a", "c", "b"]);
    expect(positionsOf(reordered)).toEqual([1, 2, 3]);
  });

  // implements FR-9 of home-page-sections
  it("moves an entry to the top and renumbers every position", () => {
    const reordered = reorderHomeEntries([A, B, C], { id: "c", toPosition: 1 });

    expect(orderOf(reordered)).toEqual(["c", "a", "b"]);
    expect(positionsOf(reordered)).toEqual([1, 2, 3]);
  });

  // implements FR-9 of home-page-sections
  it("moves an entry down to the last place", () => {
    expect(orderOf(reorderHomeEntries([A, B, C], { id: "a", toPosition: 3 }))).toEqual(["b", "c", "a"]);
  });

  it("keeps the order for a drop on the entry's own place", () => {
    expect(orderOf(reorderHomeEntries([A, B, C], { id: "b", toPosition: 2 }))).toEqual(["a", "b", "c"]);
  });

  it("clamps a place outside the list to its ends", () => {
    expect(orderOf(reorderHomeEntries([A, B, C], { id: "a", toPosition: 9 }))).toEqual(["b", "c", "a"]);
    expect(orderOf(reorderHomeEntries([A, B, C], { id: "c", toPosition: 0 }))).toEqual(["c", "a", "b"]);
  });

  it("changes nothing for an id that is not in the list, and does not touch the input", () => {
    const entries = [A, B, C];

    expect(reorderHomeEntries(entries, { id: "x", toPosition: 1 })).toBe(entries);
    expect(entries).toEqual([A, B, C]);
  });
});
