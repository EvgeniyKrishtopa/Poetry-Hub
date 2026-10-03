// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { confirmSignUp } from "../../dal/confirm-sign-up";

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const TOKEN_HASH = "token-hash-abc";
const verifyOtp = vi.fn();

describe("confirmSignUp", () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { verifyOtp } } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-5 of add-supabase-auth
  it("verifies an email link and returns confirmed", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });

    await expect(confirmSignUp(TOKEN_HASH, "email")).resolves.toBe("confirmed");
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: TOKEN_HASH, type: "email" });
  });

  it.each([
    ["a missing hash", null, "email"],
    ["an empty hash", "", "email"],
    ["type=recovery", TOKEN_HASH, "recovery"],
    ["a missing type", TOKEN_HASH, null],
  ])("returns failed for %s without calling Supabase", async (_label, tokenHash, type) => {
    await expect(confirmSignUp(tokenHash, type)).resolves.toBe("failed");
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("returns failed when verifyOtp returns an error", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { code: "otp_expired", status: 403 } });

    await expect(confirmSignUp(TOKEN_HASH, "email")).resolves.toBe("failed");
  });

  // implements FR-8 of add-supabase-auth
  it("returns failed on a config error without logging", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(confirmSignUp(TOKEN_HASH, "email")).resolves.toBe("failed");
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns failed when verifyOtp throws, logging only the error name", async () => {
    verifyOtp.mockRejectedValue(new TypeError(`fetch failed for ${TOKEN_HASH}`));

    await expect(confirmSignUp(TOKEN_HASH, "email")).resolves.toBe("failed");
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("TypeError");
    expect(logged).not.toContain(TOKEN_HASH);
  });

  it("logs the type of a thrown non-Error value", async () => {
    verifyOtp.mockRejectedValue("boom");

    await expect(confirmSignUp(TOKEN_HASH, "email")).resolves.toBe("failed");
    expect(console.error).toHaveBeenCalledWith("[auth] email confirmation failed: string");
  });
});
