import { describe, expect, it } from "vitest";

import type { GoogleCallbackParams, GoogleFailureReason } from "../../model/auth.types";
import { classifyGoogleCallbackError } from "../../model/classify-google-callback-error";

type Params = Pick<GoogleCallbackParams, "error" | "errorCode" | "errorDescription">;

/** Task 1.2's recorded shapes: a cancel has no `error_code` at all and an empty description. */
const RECORDED_CANCEL: Params = { error: "access_denied", errorCode: null, errorDescription: "" };
/** The Before User Created hook's refusal: `error_code` present but empty. */
const RECORDED_HOOK_REFUSAL: Params = {
  error: "access_denied",
  errorCode: "",
  errorDescription: "signup not allowed",
};
const RECORDED_BANNED_ACCOUNT: Params = {
  error: "access_denied",
  errorCode: "user_banned",
  errorDescription: "User is banned",
};

describe("classifyGoogleCallbackError", () => {
  // implements FR-G4 of google-sign-in
  it("reads task 1.2's recorded cancel as cancelled", () => {
    expect(classifyGoogleCallbackError(RECORDED_CANCEL)).toBe("cancelled");
  });

  // implements FR-G5 of google-sign-in
  it.each<[string, Params]>([
    ["the hook's refusal of a banned address", RECORDED_HOOK_REFUSAL],
    ["a blocked account on the redirect", RECORDED_BANNED_ACCOUNT],
    ["user_banned from the exchange, with no error or description", { error: null, errorCode: "user_banned", errorDescription: null }],
    ["user_banned with an empty description", { error: "access_denied", errorCode: "user_banned", errorDescription: "" }],
  ])("reads %s as blocked, never cancelled", (_label, params) => {
    expect(classifyGoogleCallbackError(params)).toBe("blocked");
  });

  // implements FR-G4 of google-sign-in
  it.each<[string, Params]>([
    ["access_denied with an unrecognised code", { error: "access_denied", errorCode: "provider_disabled", errorDescription: "" }],
    ["access_denied with an empty code and an empty description", { error: "access_denied", errorCode: "", errorDescription: "" }],
    ["access_denied with no code and another description", { error: "access_denied", errorCode: null, errorDescription: "Something else" }],
    ["access_denied with no code and no description", { error: "access_denied", errorCode: null, errorDescription: null }],
    ["the hook's description with an absent code", { error: "access_denied", errorCode: null, errorDescription: "signup not allowed" }],
    ["the hook's description with another code", { error: "access_denied", errorCode: "unknown", errorDescription: "signup not allowed" }],
    ["another error with the cancel's code and description", { error: "server_error", errorCode: null, errorDescription: "" }],
    ["an exchange error with an unknown code", { error: null, errorCode: "bad_code_verifier", errorDescription: null }],
    ["an exchange error with no code", { error: null, errorCode: null, errorDescription: null }],
  ])("reads %s as failed", (_label, params) => {
    const reason: GoogleFailureReason = classifyGoogleCallbackError(params);

    expect(reason).toBe("failed");
  });
});
