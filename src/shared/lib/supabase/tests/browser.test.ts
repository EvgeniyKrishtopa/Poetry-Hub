import { createBrowserClient } from "@supabase/ssr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ auth: {} })),
}));

const VALID_URL = "https://abc.supabase.co";
const VALID_KEY = "sb_publishable_known-key";

/** A fresh module per test, so the singleton never leaks between tests. */
async function loadGetClient(): Promise<typeof import("../browser").getSupabaseBrowserClient> {
  vi.resetModules();
  const { getSupabaseBrowserClient } = await import("../browser");
  return getSupabaseBrowserClient;
}

describe("getSupabaseBrowserClient", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", VALID_KEY);
  });

  afterEach(() => {
    vi.mocked(createBrowserClient).mockClear();
    vi.unstubAllEnvs();
  });

  // implements FR-8 of add-supabase-auth
  it("creates the client once, with token auto-refresh off", async () => {
    const getSupabaseBrowserClient = await loadGetClient();

    const first = getSupabaseBrowserClient();
    const second = getSupabaseBrowserClient();

    expect(second).toBe(first);
    expect(createBrowserClient).toHaveBeenCalledOnce();
    expect(createBrowserClient).toHaveBeenCalledWith(VALID_URL, VALID_KEY, {
      auth: { autoRefreshToken: false },
    });
  });

  it("propagates a config error and creates no client", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    const getSupabaseBrowserClient = await loadGetClient();
    // After `vi.resetModules`, the error class must come from the same fresh module graph.
    const { SupabaseConfigError } = await import("../errors");

    expect(() => getSupabaseBrowserClient()).toThrow(SupabaseConfigError);
    expect(createBrowserClient).not.toHaveBeenCalled();
  });
});
