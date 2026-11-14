import { describe, expect, it } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";

import type { AuthFailure } from "../../model/auth.types";
import { classifyAuthError, isBannedSignUpRejection } from "../../model/classify-auth-error";

describe("classifyAuthError", () => {
  // implements FR-2 of add-supabase-auth
  // implements FR-4 of add-supabase-auth
  it.each<[string, unknown, AuthFailure]>([
    ["invalid_credentials", { code: "invalid_credentials", status: 400 }, "invalid-credentials"],
    ["email_not_confirmed", { code: "email_not_confirmed", status: 400 }, "email-not-confirmed"],
    ["over_request_rate_limit", { code: "over_request_rate_limit", status: 429 }, "rate-limited"],
    ["over_email_send_rate_limit", { code: "over_email_send_rate_limit", status: 429 }, "rate-limited"],
    ["weak_password", { code: "weak_password", status: 422 }, "weak-password"],
    ["status 429 with no known code", { code: "something_new", status: 429 }, "rate-limited"],
    ["status 429 with no code", { status: 429 }, "rate-limited"],
    ["a config error", new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]), "unavailable"],
    ["an unknown code", { code: "something_new", status: 400 }, "unknown"],
    ["a code that is an Object.prototype key", { code: "toString" }, "unknown"],
    ["a non-string code", { code: 42 }, "unknown"],
    ["a plain Error", new Error("boom"), "unknown"],
    ["a string", "boom", "unknown"],
    ["null", null, "unknown"],
    ["undefined", undefined, "unknown"],
  ])("%s → expected failure", (_label, error, expected) => {
    expect(classifyAuthError(error)).toBe(expected);
  });

  it("checks the code before the status", () => {
    expect(classifyAuthError({ code: "weak_password", status: 429 })).toBe("weak-password");
  });

  // implements FR-16 of admin-moderation
  it("reads Auth's refusal of a blocked or banned account as restricted", () => {
    expect(classifyAuthError({ code: "user_banned", status: 400 })).toBe("restricted");
  });
});

describe("isBannedSignUpRejection", () => {
  // implements FR-17 of admin-moderation
  it.each<[string, unknown, boolean]>([
    ["the hook's rejection", { status: 403, code: "unknown", message: "signup not allowed" }, true],
    ["the message without the status", { status: 422, message: "signup not allowed" }, false],
    ["the status with another message", { status: 403, code: "unknown", message: "forbidden" }, false],
    ["the weak-password error", { status: 422, code: "weak_password", message: "Password is too weak" }, false],
    ["a plain Error", new Error("signup not allowed"), false],
    ["null", null, false],
  ])("%s → %s", (_label, error, expected) => {
    expect(isBannedSignUpRejection(error)).toBe(expected);
  });
});
