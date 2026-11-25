// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { consumePasswordResetAllowance } from "../../dal/password-reset-allowance";

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const USER_ID = "3f8a1c52-0000-4000-8000-000000000001";
const rpc = vi.fn();

describe("consumePasswordResetAllowance", () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-9 of password-recovery
  it("counts one attempt against the password_reset scope and returns allowed", async () => {
    rpc.mockResolvedValue({ data: true, error: null, status: 200 });

    await expect(consumePasswordResetAllowance()).resolves.toBe("allowed");
    expect(rpc).toHaveBeenCalledExactlyOnceWith("consume_write_allowance", { scope: "password_reset" });
  });

  // implements FR-9 of password-recovery
  it("returns refused as a value over the limit, with one warning and no error log", async () => {
    rpc.mockResolvedValue({ data: false, error: null, status: 200 });

    await expect(consumePasswordResetAllowance()).resolves.toBe("refused");
    expect(console.warn).toHaveBeenCalledExactlyOnceWith("[auth] password reset limit reached");
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-9, FR-10 of password-recovery
  it.each([
    ["an RPC error", { data: null, error: { code: "42501", message: "nope" }, status: 403 }],
    ["a restricted caller", { data: null, error: { code: "AM001", message: "restricted" }, status: 400 }],
    ["a null answer", { data: null, error: null, status: 200 }],
    ["a string answer", { data: "true", error: null, status: 200 }],
    ["a number answer", { data: 1, error: null, status: 200 }],
    ["an object answer", { data: { allowed: true }, error: null, status: 200 }],
  ])("fails closed on %s", async (_label, response) => {
    rpc.mockResolvedValue(response);

    await expect(consumePasswordResetAllowance()).resolves.toBe("failed");
  });

  // implements FR-9 of password-recovery
  it("fails closed when the RPC throws", async () => {
    rpc.mockRejectedValue(new TypeError("fetch failed"));

    await expect(consumePasswordResetAllowance()).resolves.toBe("failed");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] check password reset limit failed: TypeError");
  });

  // implements FR-9 of password-recovery
  it("fails closed on a config error without logging", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(consumePasswordResetAllowance()).resolves.toBe("failed");
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements NFR-1 of password-recovery
  it("logs the operation and the error code only, never a message or a user id", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: `permission denied for ${USER_ID}`, details: USER_ID },
      status: 403,
    });

    await consumePasswordResetAllowance();

    const logged = JSON.stringify([...vi.mocked(console.error).mock.calls, ...vi.mocked(console.warn).mock.calls]);
    expect(logged).toContain("PostgrestError 42501");
    expect(logged).not.toContain(USER_ID);
  });
});
