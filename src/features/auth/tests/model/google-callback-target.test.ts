import { describe, expect, it } from "vitest";

import type { GoogleFailureReason, GoogleSignInResult } from "../../model/auth.types";
import { getGoogleCallbackTarget } from "../../model/google-callback-target";

const NEW_ACCOUNT: GoogleSignInResult = { ok: true, accountExisted: false };
const EXISTING_ACCOUNT: GoogleSignInResult = { ok: true, accountExisted: true };

function refused(reason: GoogleFailureReason): GoogleSignInResult {
  return { ok: false, reason };
}

describe("getGoogleCallbackTarget", () => {
  // implements FR-G6 of google-sign-in
  it("sends a sign-up into an existing account to / with the account-exists notice", () => {
    expect(getGoogleCallbackTarget(EXISTING_ACCOUNT, "sign-up")).toBe("/?auth-notice=account-exists");
  });

  // implements FR-G3 of google-sign-in
  it.each<[string, GoogleSignInResult, string]>([
    ["a new account from sign-up", NEW_ACCOUNT, "sign-up"],
    ["a new account from sign-in", NEW_ACCOUNT, "sign-in"],
    ["an existing account from sign-in", EXISTING_ACCOUNT, "sign-in"],
  ])("sends %s to / with no notice", (_label, result, from) => {
    expect(getGoogleCallbackTarget(result, from)).toBe("/");
  });

  // implements FR-G4, FR-G5 of google-sign-in
  it.each<[GoogleFailureReason, string, string]>([
    ["cancelled", "sign-in", "/login?error=google-cancelled"],
    ["failed", "sign-in", "/login?error=google-failed"],
    ["blocked", "sign-in", "/login?error=google-blocked"],
    ["cancelled", "sign-up", "/signup?error=google-cancelled"],
    ["failed", "sign-up", "/signup?error=google-failed"],
    ["blocked", "sign-up", "/signup?error=google-blocked"],
  ])("sends %s from %s back to %s", (reason, from, target) => {
    const result = refused(reason);

    expect(getGoogleCallbackTarget(result, from)).toBe(target);
  });

  // implements FR-G4, FR-G7 of google-sign-in
  it.each([
    ["missing", null],
    ["empty", ""],
    ["hostile", "https://evil.example"],
    ["another casing", "SIGN-UP"],
  ])("treats a %s from as sign-in", (_label, from) => {
    const result = refused("failed");

    expect(getGoogleCallbackTarget(result, from)).toBe("/login?error=google-failed");
    expect(getGoogleCallbackTarget(EXISTING_ACCOUNT, from)).toBe("/");
  });
});
