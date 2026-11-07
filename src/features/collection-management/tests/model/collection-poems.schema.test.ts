import { describe, expect, it } from "vitest";

import { MAX_POEMS_PER_SAVE } from "../../model/collection-management.constants";
import { collectionPoemsChangeSchema } from "../../model/collection-poems.schema";

const POEM = "1a2b3c4d-0000-4000-8000-000000000001";
const OTHER_POEM = "1a2b3c4d-0000-4000-8000-000000000002";

/** `save_my_collection_poems()`'s own cap per list; collection_poems.test.sql pins it there (design D13, Gate 1 P7). */
const DATABASE_CAP = 1000;

/** `count` distinct lowercase UUIDs. */
function poemIds(count: number): string[] {
  return Array.from({ length: count }, () => crypto.randomUUID());
}

function accepts(added: readonly string[], removed: readonly string[]): boolean {
  return collectionPoemsChangeSchema.safeParse({ added, removed }).success;
}

describe("collectionPoemsChangeSchema", () => {
  // implements FR-6 of add-poems-to-collections
  it.each([
    ["an add only", [POEM], []],
    ["a removal only", [], [POEM]],
    ["both", [POEM], [OTHER_POEM]],
  ])("accepts %s", (_case, added, removed) => {
    expect(accepts(added, removed)).toBe(true);
  });

  it.each([
    ["both lists empty", [], []],
    ["a non-UUID", ["poem-1"], []],
    ["an uppercase UUID", [POEM.toUpperCase()], []],
    ["a duplicate in added", [POEM, POEM], []],
    ["a duplicate in removed", [], [POEM, POEM]],
    ["one poem both added and removed", [POEM], [POEM]],
  ])("rejects %s", (_case, added, removed) => {
    expect(accepts(added, removed)).toBe(false);
  });

  it(`accepts ${MAX_POEMS_PER_SAVE} ids per list and rejects one more`, () => {
    expect(MAX_POEMS_PER_SAVE).toBe(DATABASE_CAP);
    expect(accepts(poemIds(MAX_POEMS_PER_SAVE), poemIds(MAX_POEMS_PER_SAVE))).toBe(true);
    expect(accepts(poemIds(MAX_POEMS_PER_SAVE + 1), [])).toBe(false);
    expect(accepts([], poemIds(MAX_POEMS_PER_SAVE + 1))).toBe(false);
  });
});
