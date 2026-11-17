import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { type ClaimsResult, readClaimsState } from "../claims";

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const CLAIMS = { claims: { sub: USER_ID } };
const EXPIRED = new AuthApiError("JWT expired", 401, "bad_jwt");
const OUTAGE = new AuthRetryableFetchError("fetch failed", 0);
const SERVER_ERROR = new AuthApiError("Service Unavailable", 503, undefined);
const RATE_LIMITED = new AuthApiError("Too many requests", 429, "over_request_rate_limit");
// The two answers Auth gives for a refresh after an admin blocked an account (admin-moderation `_debug/`).
const BANNED_REFRESH = new AuthApiError("User is banned", 400, "user_banned");
const REVOKED_REFRESH = new AuthApiError("Invalid Refresh Token: Refresh Token Not Found", 400, "refresh_token_not_found");

describe("readClaimsState", () => {
  // implements FR-19, FR-20 of add-author-profiles
  it.each<[string, ClaimsResult, string]>([
    ["claims with a subject", { data: CLAIMS, error: null }, "signed-in"],
    ["no claims", { data: null, error: null }, "signed-out"],
    ["claims without a subject", { data: { claims: {} }, error: null }, "signed-out"],
    ["an empty subject", { data: { claims: { sub: "" } }, error: null }, "signed-out"],
    ["a non-string subject", { data: { claims: { sub: 42 } }, error: null }, "signed-out"],
    ["an expired token", { data: null, error: EXPIRED }, "signed-out"],
    ["claims with a non-retryable error", { data: CLAIMS, error: EXPIRED }, "signed-out"],
    ["a retryable fetch error", { data: null, error: OUTAGE }, "unknown"],
    ["a 5xx answer", { data: null, error: SERVER_ERROR }, "unknown"],
    ["a 429 rate limit", { data: null, error: RATE_LIMITED }, "unknown"],
    ["an error without a status", { data: CLAIMS, error: new Error("unexpected") }, "signed-out"],
    ["an error that isn't an object", { data: CLAIMS, error: "bad token" }, "signed-out"],
    ["claims with a retryable error", { data: CLAIMS, error: OUTAGE }, "unknown"],
  ])("%s → %s", (_label, result, expected) => {
    expect(readClaimsState(result).state).toBe(expected);
  });

  // implements FR-16 of admin-moderation
  it.each<[string, ClaimsResult]>([
    ["a refresh refused for a banned user", { data: null, error: BANNED_REFRESH }],
    ["a refresh with a token the block deleted", { data: null, error: REVOKED_REFRESH }],
  ])("reads %s as signed out, not unknown", (_label, result) => {
    expect(readClaimsState(result)).toEqual({ state: "signed-out" });
  });

  it("carries the user id only when signed in", () => {
    expect(readClaimsState({ data: CLAIMS, error: null })).toEqual({ state: "signed-in", userId: USER_ID });
    expect(readClaimsState({ data: null, error: null })).toEqual({ state: "signed-out" });
  });
});
