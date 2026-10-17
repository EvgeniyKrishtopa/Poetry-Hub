// @vitest-environment node
import { AuthRetryableFetchError, type SupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { getSessionState } from "../../dal/current-user";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const getClaims = vi.fn();

// The checks `isSignedIn` used to carry (until add-author-profiles FR-20), now on the three states.
describe("getSessionState", () => {
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
  it("is signed in when claims come back", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1" } }, error: null });

    await expect(getSessionState()).resolves.toEqual({ state: "signed-in", userId: "user-1" });
  });

  it("is signed out without logging when the result carries no data at all", async () => {
    getClaims.mockResolvedValue({ data: undefined, error: null });

    await expect(getSessionState()).resolves.toEqual({ state: "signed-out" });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("calls connection before creating the server client", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    await getSessionState();

    expect(connection).toHaveBeenCalledTimes(1);
    expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createSupabaseServerClient).mock.invocationCallOrder[0],
    );
  });

  // implements FR-20 of add-author-profiles
  it("is unknown for an invalid config, with connection called before the server client", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(getSessionState()).resolves.toEqual({ state: "unknown" });
    expect(console.error).not.toHaveBeenCalled();
    expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createSupabaseServerClient).mock.invocationCallOrder[0],
    );
  });

  it("is signed out when there are no claims", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });

    await expect(getSessionState()).resolves.toEqual({ state: "signed-out" });
  });

  // implements FR-1, NFR-2 of add-author-profiles
  it("is signed out when the claims carry no sub", async () => {
    getClaims.mockResolvedValue({ data: { claims: { role: "authenticated" } }, error: null });

    await expect(getSessionState()).resolves.toEqual({ state: "signed-out" });
  });

  it("is signed out without logging when getClaims returns an expired-token error", async () => {
    getClaims.mockResolvedValue({ data: null, error: { name: "AuthApiError", status: 401 } });

    await expect(getSessionState()).resolves.toEqual({ state: "signed-out" });
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-20 of add-author-profiles
  it("is unknown when getClaims returns a retryable error, logging only its name and status", async () => {
    getClaims.mockResolvedValue({ data: null, error: new AuthRetryableFetchError("fetch failed: secret-token-value", 503) });

    await expect(getSessionState()).resolves.toEqual({ state: "unknown" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] session check unavailable: AuthRetryableFetchError 503");
  });

  // implements FR-20 of add-author-profiles
  it("is unknown and logs only the error name on any other throw", async () => {
    getClaims.mockRejectedValue(new TypeError("fetch failed: secret-token-value"));

    await expect(getSessionState()).resolves.toEqual({ state: "unknown" });
    expect(console.error).toHaveBeenCalledTimes(1);
    const message = String(vi.mocked(console.error).mock.calls[0]?.[0]);
    expect(message).toContain("TypeError");
    expect(message).not.toContain("secret-token-value");
  });
});
