import { describe, expect, it } from "vitest";

import { draggedUserOf } from "../../model/dragged-user";

describe("draggedUserOf", () => {
  // implements FR-3 of admin-violations-feedback
  it("reads the user a dragged row carries", () => {
    expect(draggedUserOf({ userId: "u1", email: "a@b.co" })).toEqual({ userId: "u1", email: "a@b.co" });
  });

  // implements FR-3 of admin-violations-feedback
  it.each([
    ["nothing", undefined],
    ["null", null],
    ["a string", "u1"],
    ["a missing address", { userId: "u1" }],
    ["a missing id", { email: "a@b.co" }],
    ["a number for the id", { userId: 1, email: "a@b.co" }],
  ])("is null for %s, so a drop of anything else adds nobody", (_case, data) => {
    expect(draggedUserOf(data)).toBeNull();
  });
});
