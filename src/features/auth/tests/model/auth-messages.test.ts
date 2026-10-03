import { describe, expect, it } from "vitest";

import {
  CONFIRM_FAILED_MESSAGE,
  GENERIC_SERVER_ERROR,
  getFailureMessage,
  getLoginErrorMessage,
  SIGN_OUT_FAILED_MESSAGE,
} from "../../model/auth-messages";
import type { AuthFailure, AuthFlow } from "../../model/auth.types";

const GENERIC = "Something went wrong. Try again.";

describe("getFailureMessage", () => {
  // implements FR-2 of add-supabase-auth
  // implements FR-4 of add-supabase-auth
  it.each<[AuthFlow, AuthFailure, string]>([
    ["sign-in", "invalid-credentials", "Incorrect email or password."],
    ["sign-in", "email-not-confirmed", "Confirm your email first. Check your inbox for the link."],
    ["sign-in", "rate-limited", "Too many attempts. Try again in a few minutes."],
    ["sign-in", "unavailable", "Sign-in is unavailable right now."],
    ["sign-in", "unknown", GENERIC],
    ["sign-up", "rate-limited", "Too many attempts. Try again in a few minutes."],
    ["sign-up", "weak-password", "Choose a stronger password."],
    ["sign-up", "unavailable", "Sign-up is unavailable right now."],
    ["sign-up", "unknown", GENERIC],
  ])("%s × %s → its text", (flow, failure, expected) => {
    expect(getFailureMessage(flow, failure)).toBe(expected);
  });

  it.each<[AuthFlow, AuthFailure]>([
    ["sign-in", "weak-password"],
    ["sign-up", "invalid-credentials"],
    ["sign-up", "email-not-confirmed"],
  ])("unlisted pair %s × %s → the generic text", (flow, failure) => {
    expect(getFailureMessage(flow, failure)).toBe(GENERIC);
  });
});

describe("standalone messages", () => {
  // implements FR-5 of add-supabase-auth
  // implements FR-7 of add-supabase-auth
  it("match the spec's exact texts", () => {
    expect(GENERIC_SERVER_ERROR).toBe(GENERIC);
    expect(CONFIRM_FAILED_MESSAGE).toBe(
      "That confirmation link is invalid or has expired. Sign in, or sign up again to get a new link.",
    );
    expect(SIGN_OUT_FAILED_MESSAGE).toBe("Couldn't sign out. Try again.");
  });
});

describe("getLoginErrorMessage", () => {
  // implements FR-5 of add-supabase-auth
  it("maps confirm-failed to the confirm-failed text", () => {
    expect(getLoginErrorMessage("confirm-failed")).toBe(CONFIRM_FAILED_MESSAGE);
  });

  it.each([["missing", undefined], ["another value", "oops"], ["a repeated param", ["confirm-failed", "x"]]])(
    "shows nothing for %s",
    (_label, error) => {
      expect(getLoginErrorMessage(error)).toBeUndefined();
    },
  );
});
