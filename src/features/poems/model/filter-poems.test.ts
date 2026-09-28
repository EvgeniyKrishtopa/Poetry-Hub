import { describe, expect, it } from "vitest";

import { filterPoems } from "./filter-poems";
import type { Poem } from "./poem.types";

const poems: readonly Poem[] = [
  { id: "1", title: "The Road Not Taken", author: "Robert Frost", lines: [] },
  { id: "2", title: "Ozymandias", author: "Percy Bysshe Shelley", lines: [] },
];

describe("filterPoems", () => {
  it("returns all poems for an empty or whitespace-only query", () => {
    expect(filterPoems(poems, "")).toBe(poems);
    expect(filterPoems(poems, "   ")).toBe(poems);
  });

  it("matches the title case-insensitively", () => {
    expect(filterPoems(poems, "ROAD").map((p) => p.id)).toEqual(["1"]);
  });

  it("matches the author and ignores surrounding whitespace", () => {
    expect(filterPoems(poems, "  shelley ").map((p) => p.id)).toEqual(["2"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterPoems(poems, "dickinson")).toEqual([]);
  });
});
