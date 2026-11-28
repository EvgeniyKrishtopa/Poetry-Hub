import { describe, expect, it } from "vitest";

import { isRecentRecoverySession } from "../../model/recovery-session";

const NOW_SECONDS = 1_800_000_000;
const WINDOW_SECONDS = 900;

function entry(method: string, ageSeconds = 0) {
  return { method, timestamp: NOW_SECONDS - ageSeconds };
}

describe("isRecentRecoverySession", () => {
  // implements FR-3 of pre-deploy-security-hardening
  it.each(["otp", "recovery"])("accepts a fresh %s entry", (method) => {
    expect(isRecentRecoverySession([entry(method)], NOW_SECONDS)).toBe(true);
  });

  // implements FR-3 of pre-deploy-security-hardening
  it.each(["password", "oauth", "totp", "token_refresh"])("refuses a fresh %s entry", (method) => {
    expect(isRecentRecoverySession([entry(method)], NOW_SECONDS)).toBe(false);
  });

  // implements FR-3 of pre-deploy-security-hardening
  it.each([
    [WINDOW_SECONDS, true],
    [WINDOW_SECONDS + 1, false],
  ])("at an age of %i seconds answers %s", (ageSeconds, expected) => {
    expect(isRecentRecoverySession([entry("otp", ageSeconds)], NOW_SECONDS)).toBe(expected);
  });

  // The Auth server's clock may run ahead of the app's.
  it("accepts an entry stamped slightly in the future", () => {
    expect(isRecentRecoverySession([entry("otp", -5)], NOW_SECONDS)).toBe(true);
  });

  // implements FR-3 of pre-deploy-security-hardening
  it("refuses an empty list", () => {
    expect(isRecentRecoverySession([], NOW_SECONDS)).toBe(false);
  });

  it("looks at every entry, and a recent other method does not renew a stale link", () => {
    const stale = entry("otp", WINDOW_SECONDS + 1);

    expect(isRecentRecoverySession([entry("password"), entry("otp")], NOW_SECONDS)).toBe(true);
    expect(isRecentRecoverySession([entry("password"), stale], NOW_SECONDS)).toBe(false);
  });
});
