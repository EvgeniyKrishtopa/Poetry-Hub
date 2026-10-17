// @vitest-environment node
// implements FR-8 of add-contentful-home-greeting
// The installed Next still exports the matcher helper under its pre-rename name;
// newer releases call it unstable_doesProxyMatch.
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { refreshSession } from "@/shared/lib/supabase/session";

import { applySecurityHeaders, config, proxy, SECURITY_HEADERS } from "../proxy";

vi.mock("@/shared/lib/supabase/session", () => ({ refreshSession: vi.fn(), SESSION_CACHE_CONTROL: "private, no-store" }));

const MATCHED_PATHS = ["/", "/poems/some-poem"];
const EXCLUDED_PATHS = [
  "/_next/static/x.js",
  "/_next/image",
  "/favicon.ico",
  "/robots.txt",
  "/poems/mr.smith",
];
const REQUEST_URL = "http://localhost:3000/";
const SESSION_COOKIE = "sb-test-auth-token";
const SESSION_CACHE_CONTROL = "private, no-store";

function expectSecurityHeaders(response: NextResponse): void {
  expect(Object.keys(SECURITY_HEADERS)).toHaveLength(4);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    expect(response.headers.get(name)).toBe(value);
  }
}

afterEach(() => {
  vi.mocked(refreshSession).mockReset();
});

describe("applySecurityHeaders", () => {
  it("sets all four security headers with their exact values", () => {
    expectSecurityHeaders(applySecurityHeaders(NextResponse.next()));
  });
});

// implements FR-6 of add-supabase-auth
describe("proxy", () => {
  it("refreshes the session for the incoming request", async () => {
    vi.mocked(refreshSession).mockResolvedValue({ response: NextResponse.next(), session: "signed-out" });
    const request = new NextRequest(REQUEST_URL);

    await proxy(request);

    expect(refreshSession).toHaveBeenCalledWith(request);
  });

  it("keeps the refreshed cookie and no-store, and adds the security headers", async () => {
    const refreshed = NextResponse.next();
    refreshed.cookies.set(SESSION_COOKIE, "refreshed");
    refreshed.headers.set("Cache-Control", SESSION_CACHE_CONTROL);
    vi.mocked(refreshSession).mockResolvedValue({ response: refreshed, session: "signed-in" });

    const response = await proxy(new NextRequest(REQUEST_URL));

    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("refreshed");
    expect(response.headers.get("Cache-Control")).toBe(SESSION_CACHE_CONTROL);
    expectSecurityHeaders(response);
  });

  it("adds the security headers to a plain response without setting a cookie", async () => {
    vi.mocked(refreshSession).mockResolvedValue({ response: NextResponse.next(), session: "signed-out" });

    const response = await proxy(new NextRequest(REQUEST_URL));

    expect(response.headers.get("Set-Cookie")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBeNull();
    expectSecurityHeaders(response);
  });
});

describe("proxy redirect for account routes", () => {
  const ORIGIN = "http://localhost:3000";

  function request(path: string, init?: { method?: string; headers?: Record<string, string> }): NextRequest {
    return new NextRequest(`${ORIGIN}${path}`, init);
  }

  function signedOut(response = NextResponse.next()) {
    vi.mocked(refreshSession).mockResolvedValue({ response, session: "signed-out" });
  }

  // implements FR-19 of add-author-profiles
  it("sends a signed-out GET for /account/author to /login with a 307, headers, and no-store", async () => {
    signedOut();

    const response = await proxy(request("/account/author"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin).toBe(ORIGIN);
    expect(location.pathname).toBe("/login");
    expect(location.search).toBe("");
    expect(response.headers.get("Cache-Control")).toBe(SESSION_CACHE_CONTROL);
    expectSecurityHeaders(response);
  });

  // implements FR-19 of add-author-profiles
  it.each(["/account", "/account/", "/account/author/x"])("redirects a signed-out %s", async (path) => {
    signedOut();

    const response = await proxy(request(path));

    expect(response.status).toBe(307);
  });

  // implements FR-19 of add-author-profiles
  it.each(["/accounts", "/authors", "/"])("lets a signed-out %s through", async (path) => {
    signedOut();

    const response = await proxy(request(path));

    expect(response.headers.get("location")).toBeNull();
  });

  // implements FR-19 of add-author-profiles
  it("carries a revoked session's cleared cookies on the redirect", async () => {
    const refreshed = NextResponse.next();
    refreshed.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
    signedOut(refreshed);

    const response = await proxy(request("/account"));

    expect(response.status).toBe(307);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=;`);
    // Copied with its options, so the browser really deletes it.
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Path=/");
  });

  // implements FR-19, FR-9 of add-author-profiles
  it("never redirects a Server Action call, so the action can report the expired session", async () => {
    signedOut();

    const response = await proxy(request("/account/author", { method: "POST", headers: { "Next-Action": "abc123" } }));

    expect(response.headers.get("location")).toBeNull();
    expectSecurityHeaders(response);
  });

  // implements FR-19 of add-author-profiles
  it("lets a POST without Next-Action through too (only GET and HEAD are page requests)", async () => {
    signedOut();

    const response = await proxy(request("/account", { method: "POST" }));

    expect(response.headers.get("location")).toBeNull();
  });

  // implements FR-19 of add-author-profiles
  it.each(["signed-in", "unknown"] as const)("lets a %s request for /account through", async (session) => {
    vi.mocked(refreshSession).mockResolvedValue({ response: NextResponse.next(), session });

    const response = await proxy(request("/account"));

    expect(response.headers.get("location")).toBeNull();
    expectSecurityHeaders(response);
  });
});

describe("proxy matcher", () => {
  it.each(MATCHED_PATHS)("runs for %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each(EXCLUDED_PATHS)("does not run for %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });
});
