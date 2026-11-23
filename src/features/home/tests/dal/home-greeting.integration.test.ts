// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { getGreetingByKey } from "../../dal/home-greeting";
import { ABOUT_GREETING_KEY } from "../../model/home.constants";

// Real config loader and client (no module mocks): only `fetch` and the env are stubbed.
describe("getGreetingByKey with the real Contentful client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // implements FR-2 of add-contentful-home-greeting
  it("returns a config failure without throwing or calling fetch when the token is unset", async () => {
    vi.stubEnv("CONTENTFUL_SPACE_ID", "abc123space");
    vi.stubEnv("CONTENTFUL_ACCESS_TOKEN", undefined);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(getGreetingByKey(ABOUT_GREETING_KEY)).resolves.toEqual({ ok: false, reason: "config" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("[contentful] home greeting failed", {
      key: ABOUT_GREETING_KEY,
      reason: "config",
    });
  });
});
