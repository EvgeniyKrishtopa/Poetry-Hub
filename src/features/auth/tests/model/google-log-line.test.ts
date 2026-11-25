import { describe, expect, it } from "vitest";

import { getGoogleLogLine } from "../../model/google-log-line";

describe("getGoogleLogLine", () => {
  // implements NFR-G1 of google-sign-in
  it.each([
    ["a Supabase code", "user_banned", "[auth] google sign-in blocked: user_banned"],
    ["a thrown error's class name", "SupabaseConfigError", "[auth] google sign-in blocked: SupabaseConfigError"],
    ["no code", null, "[auth] google sign-in blocked"],
    ["an undefined code", undefined, "[auth] google sign-in blocked"],
    ["an empty code", "", "[auth] google sign-in blocked"],
  ])("writes the event with %s", (_label, code, expected) => {
    expect(getGoogleLogLine("blocked", code)).toBe(expected);
  });

  // implements NFR-G1 of google-sign-in
  it.each([
    ["an address", "reader@example.com"],
    ["a code value", "0b6c1f2e-9a7d-4c3b-8e5f-1a2b3c4d5e6f"],
    ["a token", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig"],
    ["a sentence", "signup not allowed"],
    ["an over-long word", "a".repeat(65)],
  ])("never writes %s from a forged error_code", (_label, code) => {
    const line = getGoogleLogLine("failed", code);

    expect(line).toBe("[auth] google sign-in failed: unrecognised");
    expect(line).not.toContain(code);
  });

  it("writes a failed start", () => {
    expect(getGoogleLogLine("start failed", "unexpected_failure")).toBe(
      "[auth] google sign-in start failed: unexpected_failure",
    );
  });
});
