// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { checkRestriction } from "../../dal/restriction-check";

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const USER_ID = "3f8a1c52-0000-4000-8000-000000000001";
const rpc = vi.fn();

describe("checkRestriction", () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-4, FR-10 of password-recovery
  it("asks the caller's own is_restricted() with no argument", async () => {
    rpc.mockResolvedValue({ data: false, error: null, status: 200 });

    await checkRestriction();

    expect(rpc).toHaveBeenCalledExactlyOnceWith("is_restricted");
  });

  // implements FR-4 of password-recovery
  it.each([
    ["restricted", true, "restricted"],
    ["allowed", false, "allowed"],
  ])("answers %s for a %s boolean", async (_label, data, expected) => {
    rpc.mockResolvedValue({ data, error: null, status: 200 });

    await expect(checkRestriction()).resolves.toBe(expected);
  });

  // implements FR-4 of password-recovery
  it.each([
    ["a JWT error", { code: "PGRST301", message: "JWT expired" }, 401],
    ["a bare 401", { code: "", message: "unauthorized" }, 401],
  ])("answers unauthenticated for %s (a token that expired since the session read)", async (_label, error, status) => {
    rpc.mockResolvedValue({ data: null, error, status });

    await expect(checkRestriction()).resolves.toBe("unauthenticated");
  });

  // implements FR-4 of password-recovery
  it.each([
    ["an RPC error", { data: null, error: { code: "42883", message: "missing" }, status: 404 }],
    ["a server error", { data: null, error: { code: "", message: "boom" }, status: 503 }],
    ["a null answer", { data: null, error: null, status: 200 }],
    ["a string answer", { data: "true", error: null, status: 200 }],
    ["an object answer", { data: { restricted: true }, error: null, status: 200 }],
  ])("answers unknown for %s, which fails closed", async (_label, response) => {
    rpc.mockResolvedValue(response);

    await expect(checkRestriction()).resolves.toBe("unknown");
  });

  // implements FR-4 of password-recovery
  it("answers unknown when the RPC throws", async () => {
    rpc.mockRejectedValue(new TypeError("fetch failed"));

    await expect(checkRestriction()).resolves.toBe("unknown");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] check restriction failed: TypeError");
  });

  // implements FR-4 of password-recovery
  it("answers unknown on a config error without logging", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(checkRestriction()).resolves.toBe("unknown");
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements NFR-1 of password-recovery
  it("logs the operation and the error code only, never a message or a user id", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42883", message: `no function for ${USER_ID}`, details: USER_ID },
      status: 404,
    });

    await checkRestriction();

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("PostgrestError 42883");
    expect(logged).not.toContain(USER_ID);
  });
});
