import { describe, expect, it } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";

import type { RecoveryRequestFailure } from "../../model/auth.types";
import { classifyRecoveryRequestError } from "../../model/classify-recovery-request-error";

describe("classifyRecoveryRequestError", () => {
  // implements FR-2, FR-10 of password-recovery
  it("answers sent for the per-address refusal, which arrives with status 429", () => {
    const error = { code: "over_email_send_rate_limit", status: 429 };

    expect(classifyRecoveryRequestError(error)).toBe("sent");
  });

  // implements FR-2 of password-recovery
  it.each<[string, unknown, "sent" | RecoveryRequestFailure]>([
    ["over_request_rate_limit", { code: "over_request_rate_limit", status: 429 }, "rate-limited"],
    ["a bare 429 with no code", { status: 429 }, "rate-limited"],
    ["a 429 with an empty code", { code: "", status: 429 }, "rate-limited"],
    ["an unlisted code with status 429", { code: "something_new", status: 429 }, "unknown"],
    ["the code `unknown` with status 429", { code: "unknown", status: 429 }, "unknown"],
    ["an unlisted code", { code: "something_new", status: 400 }, "unknown"],
    ["a code that is an Object.prototype key", { code: "toString" }, "unknown"],
    ["an error with no code and no status", { message: "boom" }, "unknown"],
    ["a config error", new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]), "unavailable"],
    ["a plain Error", new Error("boom"), "unknown"],
    ["null", null, "unknown"],
  ])("%s → %s", (_label, error, expected) => {
    expect(classifyRecoveryRequestError(error)).toBe(expected);
  });

  // implements FR-2 of password-recovery
  it("lets the code alone decide even when the status says 429", () => {
    expect(classifyRecoveryRequestError({ code: "over_email_send_rate_limit", status: 400 })).toBe("sent");
    expect(classifyRecoveryRequestError({ code: "over_request_rate_limit", status: 400 })).toBe("rate-limited");
  });
});
