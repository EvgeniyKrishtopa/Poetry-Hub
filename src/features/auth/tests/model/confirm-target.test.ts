import { describe, expect, it } from "vitest";

import type { ConfirmOutcome } from "../../model/auth.types";
import { getConfirmTarget } from "../../model/confirm-target";

describe("getConfirmTarget", () => {
  // implements FR-3 of password-recovery, FR-5 of auth
  it.each<[string, string | null, ConfirmOutcome, string]>([
    ["a verified sign-up link", "email", "verified", "/"],
    ["a failed sign-up link", "email", "failed", "/login?error=confirm-failed"],
    ["a verified recovery link", "recovery", "verified", "/reset-password"],
    ["a failed recovery link", "recovery", "failed", "/login?error=recovery-failed"],
    ["an unknown type, even verified", "magiclink", "verified", "/login?error=confirm-failed"],
    ["an unknown type, failed", "magiclink", "failed", "/login?error=confirm-failed"],
    ["a missing type", null, "verified", "/login?error=confirm-failed"],
    ["an empty type", "", "failed", "/login?error=confirm-failed"],
  ])("%s → %s", (_label, type, outcome, expected) => {
    expect(getConfirmTarget(type, outcome)).toBe(expected);
  });

  // implements FR-3 of password-recovery
  it("sends a failed recovery link and a failed sign-up link to different notices", () => {
    expect(getConfirmTarget("recovery", "failed")).not.toBe(getConfirmTarget("email", "failed"));
  });

  // implements FR-5 of auth
  it("never builds a target from the type itself", () => {
    const target = getConfirmTarget("https://evil.example", "verified");

    expect(target).toBe("/login?error=confirm-failed");
  });
});
