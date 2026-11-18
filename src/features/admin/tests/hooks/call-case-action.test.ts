import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callCaseAction } from "../../hooks/call-case-action";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("callCaseAction", () => {
  // implements FR-15 of admin-violations-feedback
  it("returns the action's answer as it is", async () => {
    await expect(callCaseAction(async () => ({ ok: true as const }))).resolves.toEqual({ ok: true });
    await expect(callCaseAction(async () => ({ ok: false as const, reason: "forbidden" }))).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(console.error).not.toHaveBeenCalled();
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

  // implements NFR-1 of admin-violations-feedback
  it.each([
    ["an Error", new TypeError("boom for anna.lis@example.com"), "TypeError"],
    ["something that is not an Error", "text for anna.lis@example.com", "unknown"],
  ])("logs only the name for %s, never its message", async (_case, thrown, name) => {
    await callCaseAction(async () => {
      throw thrown;
    });

    expect(console.error).toHaveBeenCalledExactlyOnceWith(`[admin] case action failed: ${name}`);
  });
});
