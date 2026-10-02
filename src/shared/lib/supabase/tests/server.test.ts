// @vitest-environment node
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "../errors";
import { createSupabaseServerClient } from "../server";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: {} })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const VALID_URL = "https://abc.supabase.co";
const VALID_KEY = "sb_publishable_known-key";
const SESSION_COOKIE = { name: "sb-abc-auth-token", value: "token", options: { path: "/" } };

const cookieStore = {
  getAll: vi.fn(() => [{ name: SESSION_COOKIE.name, value: SESSION_COOKIE.value }]),
  set: vi.fn(),
};

type CookieMethods = {
  getAll: () => unknown;
  setAll: (cookies: (typeof SESSION_COOKIE)[], headers: Record<string, string>) => void;
};

function cookieMethods(): CookieMethods {
  const options = vi.mocked(createServerClient).mock.calls.at(-1)?.[2];
  if (!options) throw new Error("createServerClient was not called");
  return options.cookies as unknown as CookieMethods;
}

describe("createSupabaseServerClient", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", VALID_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", VALID_KEY);
    vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  // implements FR-8 of add-supabase-auth
  it("builds a client over the request's cookie store", async () => {
    await createSupabaseServerClient();

    expect(createServerClient).toHaveBeenCalledWith(VALID_URL, VALID_KEY, expect.anything());
    expect(cookieMethods().getAll()).toEqual([
      { name: SESSION_COOKIE.name, value: SESSION_COOKIE.value },
    ]);
  });

  it("writes cookies through the cookie store", async () => {
    await createSupabaseServerClient();

    cookieMethods().setAll([SESSION_COOKIE], {});

    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_COOKIE.name,
      SESSION_COOKIE.value,
      SESSION_COOKIE.options,
    );
  });

  it("swallows the throw of a read-only cookie store", async () => {
    cookieStore.set.mockImplementationOnce(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });
    await createSupabaseServerClient();

    expect(() => cookieMethods().setAll([SESSION_COOKIE], {})).not.toThrow();
  });

  it("rejects with a config error and creates no client", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);

    await expect(createSupabaseServerClient()).rejects.toBeInstanceOf(SupabaseConfigError);
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
