import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { type ClaimsResult, readClaimsState } from "../claims";

const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const CLAIMS = { claims: { sub: USER_ID } };
const EXPIRED = new AuthApiError("JWT expired", 401, "bad_jwt");
const OUTAGE = new AuthRetryableFetchError("fetch failed", 0);
const SERVER_ERROR = new AuthApiError("Service Unavailable", 503, undefined);

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
    ["claims with a retryable error", { data: CLAIMS, error: OUTAGE }, "unknown"],
  ])("%s → %s", (_label, result, expected) => {
    expect(readClaimsState(result).state).toBe(expected);
  });

  it("carries the user id only when signed in", () => {
    expect(readClaimsState({ data: CLAIMS, error: null })).toEqual({ state: "signed-in", userId: USER_ID });
    expect(readClaimsState({ data: null, error: null })).toEqual({ state: "signed-out" });
  });
});
