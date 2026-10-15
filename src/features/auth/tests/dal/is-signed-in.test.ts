// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { isSignedIn } from "../../dal/is-signed-in";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const getClaims = vi.fn();

describe("isSignedIn", () => {
  beforeEach(() => {
    vi.mocked(connection).mockResolvedValue(undefined);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { getClaims } } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-3 of remove-browser-session-read
  it("returns true when claims come back", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });

    await expect(isSignedIn()).resolves.toBe(true);
  });

  it("returns false without logging when the result carries no data at all", async () => {
    getClaims.mockResolvedValue({ data: undefined, error: null });

    await expect(isSignedIn()).resolves.toBe(false);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("calls connection before creating the server client", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    await isSignedIn();

    expect(connection).toHaveBeenCalledTimes(1);
    expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createSupabaseServerClient).mock.invocationCallOrder[0],
    );
  });

  it("calls connection before the server client also when the config is invalid", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(isSignedIn()).resolves.toBe(false);
    expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createSupabaseServerClient).mock.invocationCallOrder[0],
    );
  });

  it("returns false when there are no claims", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    await expect(isSignedIn()).resolves.toBe(false);
  });

  it("returns false without logging when getClaims returns an error", async () => {
    getClaims.mockResolvedValue({ data: null, error: { name: "AuthApiError", status: 401 } });

    await expect(isSignedIn()).resolves.toBe(false);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns false without logging when the config is invalid", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(isSignedIn()).resolves.toBe(false);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns false and logs only the error name on any other throw", async () => {
    getClaims.mockRejectedValue(new TypeError("fetch failed: secret-token-value"));

    await expect(isSignedIn()).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledTimes(1);
    const message = String(vi.mocked(console.error).mock.calls[0]?.[0]);
    expect(message).toContain("TypeError");
    expect(message).not.toContain("secret-token-value");
  });
});
