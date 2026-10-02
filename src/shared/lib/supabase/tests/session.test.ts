// @vitest-environment node
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { refreshSession } from "../session";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

type CookieToSet = { name: string; value: string; options: Record<string, unknown> };
type CookieMethods = {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: CookieToSet[], headers: Record<string, string>) => void;
};

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
const COOKIE_NAME = "sb-abc-auth-token";
const LIBRARY_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

const getClaims = vi.fn<() => Promise<unknown>>();

/** Makes the mocked client's `getClaims` run `onClaims` against the cookie methods it was given. */
function mockClient(onClaims: (cookies: CookieMethods) => Promise<unknown>): void {
  vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
    const cookies = options.cookies as unknown as CookieMethods;
    getClaims.mockImplementation(() => onClaims(cookies));
    return { auth: { getClaims } } as unknown as ReturnType<typeof createServerClient>;
  });
}

function makeRequest(cookie?: string): NextRequest {
  return new NextRequest("https://poetry.example/", {
    headers: cookie ? { cookie } : {},
  });
}

describe("refreshSession", () => {
  beforeEach(() => {
    vi.stubEnv(URL_VAR, "https://abc.supabase.co");
    vi.stubEnv(KEY_VAR, "sb_publishable_known-key");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // implements FR-6 of add-supabase-auth
  it("puts a refreshed cookie on the response with exactly private, no-store", async () => {
    mockClient(async (cookies) => {
      cookies.setAll(
        [{ name: COOKIE_NAME, value: "fresh", options: { path: "/" } }],
        LIBRARY_CACHE_HEADERS,
      );
      return { data: { claims: {} }, error: null };
    });

    const request = makeRequest(`${COOKIE_NAME}=stale`);
    const response = await refreshSession(request);

    expect(request.cookies.get(COOKIE_NAME)?.value).toBe("fresh");
    expect(response.cookies.get(COOKIE_NAME)?.value).toBe("fresh");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });

  it("keeps the library's cache headers across a second write", async () => {
    mockClient(async (cookies) => {
      cookies.setAll([{ name: COOKIE_NAME, value: "one", options: {} }], LIBRARY_CACHE_HEADERS);
      cookies.setAll([{ name: `${COOKIE_NAME}.1`, value: "two", options: {} }], {});
      return { data: null, error: null };
    });

    const response = await refreshSession(makeRequest());

    expect(response.cookies.get(`${COOKIE_NAME}.1`)?.value).toBe("two");
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("reads the request's cookies", async () => {
    let seen: { name: string; value: string }[] = [];
    mockClient(async (cookies) => {
      seen = cookies.getAll();
      return { data: null, error: null };
    });

    await refreshSession(makeRequest(`${COOKIE_NAME}=stale`));

    expect(seen).toEqual([{ name: COOKIE_NAME, value: "stale" }]);
  });

  it("sets no cookie and adds no Cache-Control when nothing was written", async () => {
    mockClient(async () => ({ data: null, error: null }));

    const response = await refreshSession(makeRequest());

    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it("adds no Cache-Control override when setAll writes no cookie", async () => {
    mockClient(async (cookies) => {
      cookies.setAll([], {});
      return { data: null, error: null };
    });

    const response = await refreshSession(makeRequest());

    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  // implements FR-8 of add-supabase-auth
  it("logs the variable names and skips the refresh on a config error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv(URL_VAR, undefined);
    vi.stubEnv(KEY_VAR, " has space");

    const response = await refreshSession(makeRequest());

    expect(consoleError).toHaveBeenCalledWith(`[supabase] invalid configuration: ${URL_VAR}, ${KEY_VAR}`);
    expect(createServerClient).not.toHaveBeenCalled();
    expect(getClaims).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns the un-refreshed response, without logging, when getClaims throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockClient(async (cookies) => {
      cookies.setAll([{ name: COOKIE_NAME, value: "half-written", options: {} }], LIBRARY_CACHE_HEADERS);
      throw new TypeError("fetch failed");
    });

    const response = await refreshSession(makeRequest(`${COOKIE_NAME}=stale`));

    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("keeps setAll's removals when getClaims resolves with an error", async () => {
    mockClient(async (cookies) => {
      cookies.setAll([{ name: COOKIE_NAME, value: "", options: { maxAge: 0 } }], LIBRARY_CACHE_HEADERS);
      return { data: null, error: new Error("Invalid Refresh Token") };
    });

    const response = await refreshSession(makeRequest(`${COOKIE_NAME}=revoked`));

    expect(response.headers.get("set-cookie")).toContain(`${COOKIE_NAME}=;`);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
