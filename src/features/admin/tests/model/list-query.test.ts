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
    expect(readListQuery({ after: "x", email: ["a@b.co", "c@d.co"] })).toEqual({ after: "x", email: undefined });
  });

  // implements FR-3 of admin-moderation
  it("reads no parameters as the first page with no filter", () => {
    expect(readListQuery({})).toEqual({});
    expect(readListQuery({ after: ["x"], email: ["y"] })).toEqual({ after: undefined, email: undefined });
  });
});
