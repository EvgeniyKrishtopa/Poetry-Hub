// @vitest-environment node
// implements FR-1 of pre-deploy-security-hardening
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSessionCookieOptions } from "../cookie-options";

describe("getSessionCookieOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps auth cookies from page scripts and cross-site posts, and Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const options = getSessionCookieOptions();

    expect(options).toEqual({ httpOnly: true, sameSite: "lax", secure: true });
  });

  it.each(["development", "test"] as const)("is not Secure in %s, which runs on plain http", (environment) => {
    vi.stubEnv("NODE_ENV", environment);

    const options = getSessionCookieOptions();

    expect(options).toEqual({ httpOnly: true, sameSite: "lax", secure: false });
  });
});
