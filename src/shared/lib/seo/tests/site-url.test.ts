// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOCAL_SITE_URL, SITE_URL_ENV, VERCEL_PRODUCTION_HOST_ENV } from "../seo.constants";

const EXPLICIT_URL = "https://example.org";
const VERCEL_HOST = "poetry.vercel.app";

/** A fresh module per call: its once-per-process log flag starts unset. */
async function loadGetSiteUrl() {
  vi.resetModules();
  const siteUrlModule = await import("../site-url");
  return siteUrlModule.getSiteUrl;
}

describe("getSiteUrl", () => {
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv(SITE_URL_ENV, undefined);
    vi.stubEnv(VERCEL_PRODUCTION_HOST_ENV, undefined);
    logError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    logError.mockRestore();
  });

  // implements FR-11 of seo-metadata
  it("prefers the explicit setting over Vercel's host", async () => {
    vi.stubEnv(SITE_URL_ENV, EXPLICIT_URL);
    vi.stubEnv(VERCEL_PRODUCTION_HOST_ENV, VERCEL_HOST);
    const getSiteUrl = await loadGetSiteUrl();

    expect(getSiteUrl()).toBe(EXPLICIT_URL);
  });

  // implements FR-11 of seo-metadata
  it("falls back to https plus Vercel's production host", async () => {
    vi.stubEnv(VERCEL_PRODUCTION_HOST_ENV, VERCEL_HOST);
    const getSiteUrl = await loadGetSiteUrl();

    expect(getSiteUrl()).toBe(`https://${VERCEL_HOST}`);
  });

  // implements FR-11 of seo-metadata
  it("falls back to localhost when neither variable is set", async () => {
    const getSiteUrl = await loadGetSiteUrl();

    expect(getSiteUrl()).toBe(LOCAL_SITE_URL);
    expect(logError).not.toHaveBeenCalled();
  });

  it("treats an empty value as unset, without a log line", async () => {
    vi.stubEnv(SITE_URL_ENV, "");
    vi.stubEnv(VERCEL_PRODUCTION_HOST_ENV, "");
    const getSiteUrl = await loadGetSiteUrl();

    expect(getSiteUrl()).toBe(LOCAL_SITE_URL);
    expect(logError).not.toHaveBeenCalled();
  });

  // implements FR-11 of seo-metadata
  it.each([
    ["a path and a trailing slash", "https://example.org/blog/"],
    ["a query", "https://example.org?utm=1"],
    ["a hash", "https://example.org/#top"],
  ])("reduces a value with %s to its origin", async (_name, value) => {
    vi.stubEnv(SITE_URL_ENV, value);
    const getSiteUrl = await loadGetSiteUrl();

    expect(getSiteUrl()).toBe(EXPLICIT_URL);
  });

  it("reduces Vercel's host to its origin too", async () => {
    vi.stubEnv(VERCEL_PRODUCTION_HOST_ENV, `${VERCEL_HOST}/blog/`);
    const getSiteUrl = await loadGetSiteUrl();

    expect(getSiteUrl()).toBe(`https://${VERCEL_HOST}`);
  });

  // implements FR-11 of seo-metadata
  it.each([
    ["text that is not a URL", "not a url"],
    ["a URL without a scheme slashes", "localhost:3000"],
    ["a scheme other than http or https", "ftp://example.org"],
  ])("ignores %s, logs once and uses the next fallback", async (_name, value) => {
    vi.stubEnv(SITE_URL_ENV, value);
    vi.stubEnv(VERCEL_PRODUCTION_HOST_ENV, VERCEL_HOST);
    const getSiteUrl = await loadGetSiteUrl();

    expect(getSiteUrl()).toBe(`https://${VERCEL_HOST}`);
    expect(getSiteUrl()).toBe(`https://${VERCEL_HOST}`);

    expect(logError).toHaveBeenCalledTimes(1);
    const [line] = logError.mock.calls[0] ?? [];
    expect(line).toContain(SITE_URL_ENV);
    expect(line).not.toContain(value);
  });

  it("logs one line in all when both variables are invalid, and ends on localhost", async () => {
    vi.stubEnv(SITE_URL_ENV, "not a url");
    vi.stubEnv(VERCEL_PRODUCTION_HOST_ENV, "not a host");
    const getSiteUrl = await loadGetSiteUrl();

    expect(getSiteUrl()).toBe(LOCAL_SITE_URL);
    expect(getSiteUrl()).toBe(LOCAL_SITE_URL);
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
