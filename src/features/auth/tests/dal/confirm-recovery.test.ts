// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { confirmRecovery } from "../../dal/confirm-recovery";

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const TOKEN_HASH = "token-hash-abc";
const verifyOtp = vi.fn();

describe("confirmRecovery", () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { verifyOtp } } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-3 of password-recovery
  it("verifies a recovery link and returns verified", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });

    await expect(confirmRecovery(TOKEN_HASH, "recovery")).resolves.toBe("verified");
    expect(verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: TOKEN_HASH, type: "recovery" });
  });

  // implements FR-3 of password-recovery
  it.each([
    ["a missing hash", null, "recovery"],
    ["an empty hash", "", "recovery"],
    ["type=email", TOKEN_HASH, "email"],
    ["a missing type", TOKEN_HASH, null],
  ])("returns failed for %s without calling Supabase", async (_label, tokenHash, type) => {
    await expect(confirmRecovery(tokenHash, type)).resolves.toBe("failed");
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  // implements FR-3 of password-recovery
  it("returns failed when verifyOtp returns an error", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { code: "otp_expired", status: 403 } });

    await expect(confirmRecovery(TOKEN_HASH, "recovery")).resolves.toBe("failed");
  });

  // implements FR-3, FR-10 of password-recovery
  it("returns failed for a blocked account's link (user_banned), the same as for an expired one", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { code: "user_banned", status: 403 } });

    await expect(confirmRecovery(TOKEN_HASH, "recovery")).resolves.toBe("failed");
  });

  // implements FR-3 of password-recovery
  it("returns failed on a config error without logging", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(confirmRecovery(TOKEN_HASH, "recovery")).resolves.toBe("failed");
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements NFR-1 of password-recovery
  it("returns failed when verifyOtp throws, logging only the error name", async () => {
    verifyOtp.mockRejectedValue(new TypeError(`fetch failed for ${TOKEN_HASH}`));

    await expect(confirmRecovery(TOKEN_HASH, "recovery")).resolves.toBe("failed");
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("TypeError");
    expect(logged).not.toContain(TOKEN_HASH);
  });

  it("logs the type of a thrown non-Error value", async () => {
    verifyOtp.mockRejectedValue("boom");

    await expect(confirmRecovery(TOKEN_HASH, "recovery")).resolves.toBe("failed");
    expect(console.error).toHaveBeenCalledWith("[auth] recovery link verification failed: string");
  });

  // implements NFR-1 of password-recovery
  it("logs nothing when verifyOtp returns an error holding the token hash", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { code: "otp_expired", status: 403, message: TOKEN_HASH } });

    await confirmRecovery(TOKEN_HASH, "recovery");

    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(TOKEN_HASH);
  });
});
