import { describe, expect, it } from "vitest";

import { readListQuery } from "../../model/list-query";

describe("readListQuery", () => {
  // implements FR-3 of admin-moderation
  it("reads the cursor from the URL parameters", () => {
    expect(readListQuery({ after: "x" })).toEqual({ after: "x" });
  });

  // implements FR-3 of admin-moderation
  it("ignores a repeated parameter instead of failing", () => {
    expect(readListQuery({ after: ["x", "y"] })).toEqual({ after: undefined });
  });

  // implements FR-3 of admin-moderation
  it("reads no parameters as the first page", () => {
    expect(readListQuery({})).toEqual({});
  });

  // implements FR-3 of admin-violations-feedback
  it("ignores the removed `email` filter, whatever it holds", () => {
    expect(readListQuery({ after: "x", email: "a@b.co" })).toEqual({ after: "x" });
    expect(readListQuery({ email: ["a@b.co", "c@d.co"] })).toEqual({});
    expect(readListQuery({ after: ["x"], email: "a@b.co" })).toEqual({ after: undefined });
  });
});
