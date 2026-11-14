import { describe, expect, it } from "vitest";

import { toFailureReason, toModerationActionResult } from "../../model/action-results";
import { MODERATION_FAILURE_MESSAGES, MODERATION_RESULT_MESSAGES } from "../../model/admin-messages";
import type { ModerationDbStatus } from "../../model/admin.types";

describe("toModerationActionResult", () => {
  // implements FR-4, FR-5, FR-6 of admin-moderation
  it.each([
    ["blocked", "blocked"],
    ["unblocked", "unblocked"],
    ["banned", "banned"],
    ["revoked", "revoked"],
    ["no-sessions", "no-sessions"],
  ] as const)("maps the answer %s to the success the row shows", (status, shown) => {
    expect(toModerationActionResult({ ok: true, status })).toEqual({ ok: true, status: shown });
  });

  // implements FR-12 of admin-moderation
  it.each([
    "already-restricted",
    "not-blocked",
    "target-is-admin",
    "not-found",
  ] as const satisfies readonly ModerationDbStatus[])("maps the answer %s to a failure of the same name", (status) => {
    expect(toModerationActionResult({ ok: true, status })).toEqual({ ok: false, reason: status });
  });

  // implements FR-12 of admin-moderation
  it("keeps a permission failure, an ended session and an outage apart", () => {
    expect(toModerationActionResult({ ok: false, failure: "forbidden" })).toEqual({ ok: false, reason: "forbidden" });
    expect(toModerationActionResult({ ok: false, failure: "unauthenticated" })).toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(toModerationActionResult({ ok: false, failure: "unavailable" })).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  // implements FR-12 of admin-moderation
  it("shows an unknown failure as the outage text, never as success", () => {
    expect(toModerationActionResult({ ok: false, failure: "unknown" })).toEqual({ ok: false, reason: "unavailable" });
  });

  // implements FR-12 of admin-moderation
  it("has a message for every success and every failure it can return", () => {
    const successes = ["blocked", "unblocked", "banned", "revoked", "no-sessions"] as const;
    const reasons = [
      "already-restricted",
      "not-blocked",
      "target-is-admin",
      "not-found",
      "forbidden",
      "unauthenticated",
      "unavailable",
      "invalid",
    ] as const;

    for (const status of successes) expect(MODERATION_RESULT_MESSAGES[status]).toBeTruthy();
    for (const reason of reasons) expect(MODERATION_FAILURE_MESSAGES[reason]).toBeTruthy();
    // The three are different texts, so the admin can tell them apart.
    expect(
      new Set([
        MODERATION_FAILURE_MESSAGES.forbidden,
        MODERATION_FAILURE_MESSAGES.unauthenticated,
        MODERATION_FAILURE_MESSAGES.unavailable,
      ]).size,
    ).toBe(3);
  });
});

describe("toFailureReason", () => {
  // implements FR-12 of admin-moderation
  it.each([
    ["forbidden", "forbidden"],
    ["unauthenticated", "unauthenticated"],
    ["unavailable", "unavailable"],
    ["unknown", "unavailable"],
  ] as const)("reads %s as %s", (failure, reason) => {
    expect(toFailureReason(failure)).toBe(reason);
  });
});
