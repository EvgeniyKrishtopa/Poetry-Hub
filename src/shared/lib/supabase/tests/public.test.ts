// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "../errors";
import { createSupabasePublicClient } from "../public";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const VALID_URL = "https://abc.supabase.co";
const VALID_KEY = "sb_publishable_known-key";

describe("createSupabasePublicClient", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", VALID_KEY);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  // implements FR-13, FR-14 of add-author-profiles
  it("builds a client that neither keeps nor refreshes a session", () => {
    createSupabasePublicClient();

    expect(createClient).toHaveBeenCalledWith(VALID_URL, VALID_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it("never reads the request's cookies", () => {
    createSupabasePublicClient();

    expect(cookies).not.toHaveBeenCalled();
  });

  // implements NFR-3 of add-author-profiles
  it("throws a config error naming the variable, not its value, and creates no client", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "ftp://not-allowed.example");

    let thrown: unknown;
    try {
      createSupabasePublicClient();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SupabaseConfigError);
    const { message } = thrown as SupabaseConfigError;
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).not.toContain("not-allowed");
    expect(createClient).not.toHaveBeenCalled();
  });
});
