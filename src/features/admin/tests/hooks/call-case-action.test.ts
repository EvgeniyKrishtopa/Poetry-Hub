import { describe, expect, it } from "vitest";

import { callCaseAction } from "../../hooks/call-case-action";

describe("callCaseAction", () => {
  // implements FR-15 of admin-violations-feedback
  it("returns the action's answer as it is", async () => {
    await expect(callCaseAction(async () => ({ ok: true as const }))).resolves.toEqual({ ok: true });
    await expect(callCaseAction(async () => ({ ok: false as const, reason: "forbidden" }))).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  // implements FR-15 of admin-violations-feedback
  it("reads a missing answer as unavailable", async () => {
    await expect(callCaseAction(async () => undefined)).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  // implements FR-15 of admin-violations-feedback
  it("reads a thrown error as unavailable, and never throws", async () => {
    await expect(
      callCaseAction(async () => {
        throw new Error("network");
      }),
    ).resolves.toEqual({ ok: false, reason: "unavailable" });
  });
});
