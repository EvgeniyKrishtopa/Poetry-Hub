import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSupabaseBrowserClient, SupabaseConfigError } from "@/shared/lib/supabase";

import { getSignedInEmail } from "../../api/auth.api";
import { authKeys, sessionQueryOptions } from "../../api/auth.queries";

vi.mock("@/shared/lib/supabase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/supabase")>()),
  getSupabaseBrowserClient: vi.fn(),
}));

const getClaims = vi.fn();

function withClient() {
  vi.mocked(getSupabaseBrowserClient).mockReturnValue({ auth: { getClaims } } as unknown as SupabaseClient);
}

describe("getSignedInEmail", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-7 of add-supabase-auth
  it("returns the email claim when signed in", async () => {
    withClient();
    getClaims.mockResolvedValue({ data: { claims: { email: "reader@example.com" } }, error: null });

    await expect(getSignedInEmail()).resolves.toBe("reader@example.com");
  });

  it.each([
    ["no claims", { data: null, error: null }],
    ["claims without an email", { data: { claims: {} }, error: null }],
    ["a resolved error", { data: null, error: { name: "AuthSessionMissingError" } }],
  ])("returns null for %s", async (_label, response) => {
    withClient();
    getClaims.mockResolvedValue(response);

    await expect(getSignedInEmail()).resolves.toBeNull();
  });

  it("returns null when getClaims throws", async () => {
    withClient();
    getClaims.mockRejectedValue(new Error("network down"));

    await expect(getSignedInEmail()).resolves.toBeNull();
  });

  // implements FR-8 of add-supabase-auth
  it("returns null when the config is invalid", async () => {
    vi.mocked(getSupabaseBrowserClient).mockImplementation(() => {
      throw new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]);
    });

    await expect(getSignedInEmail()).resolves.toBeNull();
  });
});

describe("session query", () => {
  // implements FR-7 of add-supabase-auth
  it("uses the ['auth', 'session'] key and getSignedInEmail", () => {
    expect(authKeys.session()).toEqual(["auth", "session"]);
    expect(sessionQueryOptions.queryKey).toEqual(["auth", "session"]);
    expect(sessionQueryOptions.queryFn).toBe(getSignedInEmail);
  });
});
