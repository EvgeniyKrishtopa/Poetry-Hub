// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { getCurrentUserId, requireUserId } from "../../dal/current-user";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

/** Shaped like Next's real redirect error: `redirect()` never returns. */
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;replace;${url};307;` });
  }),
}));

const USER_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

const getClaims = vi.fn();

describe("current user", () => {
  beforeEach(() => {
    vi.mocked(connection).mockResolvedValue(undefined);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { getClaims } } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("getCurrentUserId", () => {
    // implements FR-1, FR-2, NFR-2 of add-author-profiles
    it("returns the claims' sub", async () => {
      getClaims.mockResolvedValue({ data: { claims: { sub: USER_ID } }, error: null });

      await expect(getCurrentUserId()).resolves.toBe(USER_ID);
    });

    it("calls connection before creating the server client", async () => {
      getClaims.mockResolvedValue({ data: null, error: null });

      await getCurrentUserId();

      expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(createSupabaseServerClient).mock.invocationCallOrder[0],
      );
    });

    it("returns null without logging when getClaims returns an error", async () => {
      getClaims.mockResolvedValue({
        data: { claims: { sub: USER_ID } },
        error: { name: "AuthApiError", status: 401 },
      });

      await expect(getCurrentUserId()).resolves.toBeNull();
      expect(console.error).not.toHaveBeenCalled();
    });

    it.each([
      ["no data", undefined],
      ["no claims", { claims: null }],
      ["no sub", { claims: {} }],
      ["an empty sub", { claims: { sub: "" } }],
    ])("returns null for %s", async (_case, data) => {
      getClaims.mockResolvedValue({ data, error: null });

      await expect(getCurrentUserId()).resolves.toBeNull();
    });

    it("returns null without logging when the config is invalid", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

      await expect(getCurrentUserId()).resolves.toBeNull();
      expect(console.error).not.toHaveBeenCalled();
    });

    it("returns null and logs only the error name on any other throw", async () => {
      getClaims.mockRejectedValue(new TypeError("fetch failed: secret-token-value"));

      await expect(getCurrentUserId()).resolves.toBeNull();
      expect(console.error).toHaveBeenCalledTimes(1);
      const message = String(vi.mocked(console.error).mock.calls[0]?.[0]);
      expect(message).toBe("[auth] session check failed: TypeError");
    });
  });

  describe("requireUserId", () => {
    // implements FR-1, FR-2 of add-author-profiles
    it("returns the user id without redirecting", async () => {
      getClaims.mockResolvedValue({ data: { claims: { sub: USER_ID } }, error: null });

      await expect(requireUserId()).resolves.toBe(USER_ID);
      expect(redirect).not.toHaveBeenCalled();
    });

    it("redirects to /login when there is no user", async () => {
      getClaims.mockResolvedValue({ data: null, error: null });

      await expect(requireUserId()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("redirects to /login when the session check throws", async () => {
      getClaims.mockRejectedValue(new TypeError("fetch failed"));

      await expect(requireUserId()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });
});
