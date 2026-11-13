import { describe, expect, it } from "vitest";

import { areMoveIdsValid, moveCollectionInputSchema, movePoemInputSchema } from "../../model/move.schema";

const POEM_ID = "1a2b3c4d-0000-4000-8000-000000000001";
const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

const FREE = { kind: "free" } as const;
const IN_COLLECTION = { kind: "collection", collectionId: COLLECTION_ID } as const;

describe("movePoemInputSchema", () => {
  // implements FR-6 of drag-and-drop-ordering
  it("accepts a poem moved between a collection and the free poems", () => {
    const input = { poemId: POEM_ID, from: IN_COLLECTION, to: FREE, toIndex: 0 };

    expect(movePoemInputSchema.parse(input)).toEqual(input);
  });

  // implements FR-6 of drag-and-drop-ordering: any integer passes, the database clamps it
  it.each([-5, 0, 99])("accepts the integer place %i", (toIndex) => {
    expect(movePoemInputSchema.safeParse({ poemId: POEM_ID, from: FREE, to: FREE, toIndex }).success).toBe(true);
  });

  // implements FR-6 of drag-and-drop-ordering
  it.each([
    ["a fractional place", { poemId: POEM_ID, from: FREE, to: FREE, toIndex: 1.5 }],
    ["a missing place", { poemId: POEM_ID, from: FREE, to: FREE }],
    ["an unknown list kind", { poemId: POEM_ID, from: { kind: "shelf" }, to: FREE, toIndex: 0 }],
    ["a collection list with no id", { poemId: POEM_ID, from: { kind: "collection" }, to: FREE, toIndex: 0 }],
  ])("rejects %s", (_case, input) => {
    expect(movePoemInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("moveCollectionInputSchema", () => {
  // implements FR-5 of drag-and-drop-ordering
  it("accepts a collection and an integer place", () => {
    expect(moveCollectionInputSchema.safeParse({ collectionId: COLLECTION_ID, toIndex: 2 }).success).toBe(true);
  });

  it("rejects a non-integer place", () => {
    expect(moveCollectionInputSchema.safeParse({ collectionId: COLLECTION_ID, toIndex: 0.5 }).success).toBe(false);
  });
});

describe("areMoveIdsValid", () => {
  // implements FR-6 of drag-and-drop-ordering
  it("accepts lowercase UUIDs in every position of a poem move", () => {
    expect(areMoveIdsValid({ poemId: POEM_ID, from: IN_COLLECTION, to: IN_COLLECTION, toIndex: 0 })).toBe(true);
  });

  it("names no collection for the free poems", () => {
    expect(areMoveIdsValid({ poemId: POEM_ID, from: FREE, to: FREE, toIndex: 0 })).toBe(true);
  });

  it.each([
    ["the poem id", { poemId: "abc", from: FREE, to: FREE, toIndex: 0 }],
    ["an uppercase poem id", { poemId: POEM_ID.toUpperCase(), from: FREE, to: FREE, toIndex: 0 }],
    ["the source collection id", { poemId: POEM_ID, from: { kind: "collection", collectionId: "x" }, to: FREE, toIndex: 0 }],
    ["the target collection id", { poemId: POEM_ID, from: FREE, to: { kind: "collection", collectionId: "x" }, toIndex: 0 }],
  ] as const)("refuses a poem move with a malformed %s", (_case, input) => {
    expect(areMoveIdsValid(input)).toBe(false);
  });

  // implements FR-5 of drag-and-drop-ordering
  it("checks a collection move's one id", () => {
    expect(areMoveIdsValid({ collectionId: COLLECTION_ID, toIndex: 0 })).toBe(true);
    expect(areMoveIdsValid({ collectionId: COLLECTION_ID.toUpperCase(), toIndex: 0 })).toBe(false);
  });
});
