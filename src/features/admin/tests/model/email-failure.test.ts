import { describe, expect, it } from "vitest";

import { isTransientEmailFailure } from "../../model/email-failure";

describe("isTransientEmailFailure", () => {
  // implements FR-11, FR-14 of admin-violations-feedback
  it.each([
    [{ reason: "timeout" }],
    [{ reason: "network" }],
    [{ reason: "http", status: 500 }],
    [{ reason: "http", status: 503 }],
    [{ reason: "http", status: 409 }],
  ] as const)("is true for %j: it may have been delivered", (failure) => {
    expect(isTransientEmailFailure(failure)).toBe(true);
  });

  // implements FR-11, FR-14 of admin-violations-feedback
  it.each([
    [{ reason: "config" }],
    [{ reason: "conflict" }],
    [{ reason: "http", status: 422 }],
    [{ reason: "http", status: 499 }],
    [{ reason: "http" }],
  ] as const)("is false for %j: nothing was accepted", (failure) => {
    expect(isTransientEmailFailure(failure)).toBe(false);
  });
});
