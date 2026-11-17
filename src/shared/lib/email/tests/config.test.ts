// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readEmailConfig } from "../config";
import { EMAIL_ENV } from "../email.constants";

const API_KEY = "re_known-Secret_key123";
const FROM = "Poetry Hub <noreply@mail.example.test>";

describe("readEmailConfig", () => {
  beforeEach(() => {
    vi.stubEnv(EMAIL_ENV.apiKey, API_KEY);
    vi.stubEnv(EMAIL_ENV.from, FROM);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the key and the sender", () => {
    expect(readEmailConfig()).toEqual({ ok: true, config: { apiKey: API_KEY, from: FROM } });
  });

  // implements NFR-1 of admin-violations-feedback
  it("names the key variable, never its value, when the key is unset or malformed", () => {
    vi.stubEnv(EMAIL_ENV.apiKey, "not-a-key");

    const result = readEmailConfig();

    expect(result).toEqual({ ok: false, variable: "RESEND_API_KEY" });
    expect(JSON.stringify(result)).not.toContain("not-a-key");
  });

  // implements NFR-1 of admin-violations-feedback
  it("names the sender variable, never its value, when the sender is unset or malformed", () => {
    vi.stubEnv(EMAIL_ENV.from, "not-an-address");

    const result = readEmailConfig();

    expect(result).toEqual({ ok: false, variable: "EMAIL_FROM" });
    expect(JSON.stringify(result)).not.toContain("not-an-address");
  });

  it("reads the variables on each call, not once at import", () => {
    expect(readEmailConfig().ok).toBe(true);

    vi.stubEnv(EMAIL_ENV.apiKey, undefined);

    expect(readEmailConfig()).toEqual({ ok: false, variable: "RESEND_API_KEY" });
  });
});
