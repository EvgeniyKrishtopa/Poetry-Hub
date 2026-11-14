import { describe, expect, it } from "vitest";

import { readListQuery } from "../../model/list-query";

describe("readListQuery", () => {
  // implements FR-3 of admin-moderation
  it("reads the cursor and the address from the URL parameters", () => {
    expect(readListQuery({ after: "x", email: "a@b.co" })).toEqual({
      after: "x",
      email: "a@b.co",
    });
  });

  // implements FR-3 of admin-moderation
  it("ignores a repeated parameter instead of failing", () => {
    expect(readListQuery({ after: ["x", "y"], email: "a@b.co" })).toEqual({
      after: undefined,
      email: "a@b.co",
    });
  });
});
