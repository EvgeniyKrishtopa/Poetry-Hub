// @vitest-environment node
import { describe, expect, it } from "vitest";

import { deletePoemInputSchema, isPoemId } from "../../model/delete-poem.schema";

const POEM_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

// implements FR-3, FR-4 of delete-poem
describe("deletePoemInputSchema", () => {
  it("accepts any string id, so a malformed one reaches the handler's guard", () => {
    expect(deletePoemInputSchema.parse({ poemId: "not-a-uuid" })).toEqual({ poemId: "not-a-uuid" });
  });

  it("rejects a missing or non-string id", () => {
    expect(deletePoemInputSchema.safeParse({}).success).toBe(false);
    expect(deletePoemInputSchema.safeParse({ poemId: 1 }).success).toBe(false);
  });

  it("keeps only the id: an author id in the input never reaches the handler", () => {
    expect(deletePoemInputSchema.parse({ poemId: POEM_ID, authorId: POEM_ID })).toEqual({ poemId: POEM_ID });
  });
});

// implements FR-4 of delete-poem
describe("isPoemId", () => {
  it("accepts a lowercase UUID", () => {
    expect(isPoemId(POEM_ID)).toBe(true);
  });

  it.each([
    ["an uppercase spelling", POEM_ID.toUpperCase()],
    ["an empty string", ""],
    ["junk", "../../etc/passwd"],
    ["a UUID with surrounding spaces", ` ${POEM_ID} `],
    ["a UUID without dashes", POEM_ID.replaceAll("-", "")],
  ])("rejects %s", (_case, poemId) => {
    expect(isPoemId(poemId)).toBe(false);
  });
});
