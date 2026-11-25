import { describe, expect, it } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";

import type { UpdatePasswordFailure } from "../../model/auth.types";
import { classifyUpdatePasswordError } from "../../model/classify-update-password-error";

describe("classifyUpdatePasswordError", () => {
  // implements FR-5, FR-8, FR-10 of password-recovery
  it.each<[string, unknown, UpdatePasswordFailure]>([
    ["same_password", { code: "same_password", status: 422 }, "same-password"],
    ["weak_password", { code: "weak_password", status: 422 }, "weak-password"],
    ["over_request_rate_limit", { code: "over_request_rate_limit", status: 429 }, "rate-limited"],
    ["a config error", new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]), "unavailable"],
    // The sign-in text of `restricted` speaks of a block, and no step of the recovery flow may.
    ["user_banned (the restricted kind)", { code: "user_banned", status: 403 }, "unknown"],
    ["invalid_credentials", { code: "invalid_credentials", status: 400 }, "unknown"],
    ["email_not_confirmed", { code: "email_not_confirmed", status: 400 }, "unknown"],
    ["an unlisted code", { code: "something_new", status: 400 }, "unknown"],
    ["a plain Error", new Error("boom"), "unknown"],
  ])("%s → %s", (_label, error, expected) => {
    expect(classifyUpdatePasswordError(error)).toBe(expected);
  });
});
