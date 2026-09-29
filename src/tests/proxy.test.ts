// @vitest-environment node
// implements FR-8 of add-contentful-home-greeting
// The installed Next still exports the matcher helper under its pre-rename name;
// newer releases call it unstable_doesProxyMatch.
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import { config, proxy, SECURITY_HEADERS } from "../proxy";

const MATCHED_PATHS = ["/", "/poems/some-poem"];
const EXCLUDED_PATHS = [
  "/_next/static/x.js",
  "/_next/image",
  "/favicon.ico",
  "/robots.txt",
  "/poems/mr.smith",
];

describe("proxy", () => {
  it("sets all four security headers with their exact values", () => {
    const response = proxy();

    expect(Object.keys(SECURITY_HEADERS)).toHaveLength(4);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name)).toBe(value);
    }
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
