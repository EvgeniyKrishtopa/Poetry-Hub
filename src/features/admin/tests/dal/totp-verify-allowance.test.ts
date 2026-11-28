// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { consumeTotpVerifyAllowance } from "../../dal/totp-verify-allowance";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const rpc = vi.fn();

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("consumeTotpVerifyAllowance", () => {
  // implements FR-7 of pre-deploy-security-hardening
  it("counts one attempt in the totp_verify scope", async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    expect(await consumeTotpVerifyAllowance()).toBe("allowed");
    expect(rpc).toHaveBeenCalledExactlyOnceWith("consume_write_allowance", { scope: "totp_verify" });
  });

  it("answers refused over the limit, and failed, never allowed, when it can't tell", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await consumeTotpVerifyAllowance()).toBe("refused");

    rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" }, status: 403 });
    expect(await consumeTotpVerifyAllowance()).toBe("failed");

    rpc.mockResolvedValueOnce({ data: "yes", error: null });
    expect(await consumeTotpVerifyAllowance()).toBe("failed");

    rpc.mockRejectedValueOnce(new Error("offline"));
    expect(await consumeTotpVerifyAllowance()).toBe("failed");
  });
});
