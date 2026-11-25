import { describe, expect, it } from "vitest";

import { parseResetStatus } from "../../model/reset-status";

describe("parseResetStatus", () => {
  // implements FR-4 of password-recovery
  it.each([
    ["updated", "updated"],
    ["updated-sign-out-failed", "updated-sign-out-failed"],
  ])("reads %s as a done-notice kind", (value, expected) => {
    expect(parseResetStatus(value)).toBe(expected);
  });

  // implements FR-4 of password-recovery
  it.each([
    ["no value", undefined],
    ["another value", "done"],
    ["a different case", "Updated"],
    ["a repeated parameter", ["updated", "updated"]],
  ])("reads %s as no status", (_label, value) => {
    expect(parseResetStatus(value)).toBeUndefined();
  });
});
