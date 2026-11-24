// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { getHomeBanner } from "../../dal/home-banner";

// Real config loader and client (no module mocks): only `fetch` and the env are stubbed.
describe("getHomeBanner with the real Contentful client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // implements FR-B3 of home-contentful-content
  it("returns a config failure without throwing or calling fetch when the token is unset", async () => {
    vi.stubEnv("CONTENTFUL_SPACE_ID", "abc123space");
    vi.stubEnv("CONTENTFUL_ACCESS_TOKEN", undefined);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(getHomeBanner()).resolves.toEqual({ ok: false, reason: "config" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("[contentful] home banner failed", { reason: "config" });
  });
});
