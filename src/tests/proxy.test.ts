// @vitest-environment node
// implements FR-8 of add-contentful-home-greeting
// The installed Next still exports the matcher helper under its pre-rename name;
// newer releases call it unstable_doesProxyMatch.
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { refreshSession } from "@/shared/lib/supabase/session";

import { applySecurityHeaders, config, proxy, SECURITY_HEADERS } from "../proxy";

vi.mock("@/shared/lib/supabase/session", () => ({ refreshSession: vi.fn() }));

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
    vi.mocked(refreshSession).mockResolvedValue(NextResponse.next());
    const request = new NextRequest(REQUEST_URL);

    await proxy(request);

    expect(refreshSession).toHaveBeenCalledWith(request);
  });

  it("keeps the refreshed cookie and no-store, and adds the security headers", async () => {
    const refreshed = NextResponse.next();
    refreshed.cookies.set(SESSION_COOKIE, "refreshed");
    refreshed.headers.set("Cache-Control", SESSION_CACHE_CONTROL);
    vi.mocked(refreshSession).mockResolvedValue(refreshed);

    const response = await proxy(new NextRequest(REQUEST_URL));

    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("refreshed");
    expect(response.headers.get("Cache-Control")).toBe(SESSION_CACHE_CONTROL);
    expectSecurityHeaders(response);
  });

  it("adds the security headers to a plain response without setting a cookie", async () => {
    vi.mocked(refreshSession).mockResolvedValue(NextResponse.next());

    const response = await proxy(new NextRequest(REQUEST_URL));

    expect(response.headers.get("Set-Cookie")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBeNull();
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
