import { describe, expect, it } from "vitest";

import { comparePoems } from "../../model/compare-poems";
import type { Poem } from "../../model/poem.types";

function poem(id: string, publishedAt: string): Poem {
  return { id, title: id, text: "", illustrationSrc: `/mock-poems/${id}.svg`, publishedAt, genre: "Лирика" };
}

describe("comparePoems", () => {
  // implements FR-2 of add-author-poems
  it("orders the newest publication date first", () => {
    const poems = [poem("garden", "2026-03-12"), poem("station", "2026-07-01"), poem("bridge", "2026-01-20")];

    expect(poems.sort(comparePoems).map(({ id }) => id)).toEqual(["station", "garden", "bridge"]);
  });

  it("orders equal dates by id", () => {
    const poems = [poem("b", "2026-03-12"), poem("a", "2026-03-12")];

    expect(poems.sort(comparePoems).map(({ id }) => id)).toEqual(["a", "b"]);
    expect(comparePoems(poems[0], poems[0])).toBe(0);
  });
});
